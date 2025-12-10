from django.shortcuts import render, redirect
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, FileResponse, Http404
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import datetime, timedelta
from .models import CustomUser, Category, Document
from django.views.decorators.csrf import csrf_exempt
import cloudinary
import cloudinary.uploader
import cloudinary.utils
import json
import time
import os
import re

def index(request):
    return render(request, 'index.html')

def register(request):
    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        apellido = request.POST.get('apellido')
        correo = request.POST.get('correo')
        password = request.POST.get('password')

        print(f"🔍 REGISTRO - Datos recibidos:")
        print(f"   Nombre: '{nombre}'")
        print(f"   Apellido: '{apellido}'")
        print(f"   Correo: '{correo}'")
        print(f"   Password: '{password}' (longitud: {len(password) if password else 0})")

        if not all([nombre, apellido, correo, password]):
            print("❌ Faltan campos")
            return render(request, 'register.html', {'error': 'Todos los campos son obligatorios'})

        if CustomUser.objects.filter(email=correo).exists():
            print("❌ Usuario ya existe")
            return render(request, 'register.html', {'error': 'El correo ya está registrado'})

        try:
            user = CustomUser.objects.create_user(
                email=correo,
                password=password,
                first_name=nombre,
                last_name=apellido
            )
            
            default_categories = [
                {'name': 'Facturas', 'icon': '📄'},
                {'name': 'Contratos', 'icon': '📋'},
                {'name': 'Reportes', 'icon': '📊'},
                {'name': 'Certificados', 'icon': '🎓'},
            ]
            
            for cat in default_categories:
                Category.objects.create(
                    user=user,
                    name=cat['name'],
                    icon=cat['icon']
                )
            
            print(f"✅ Usuario registrado exitosamente: {user.email}")
            return redirect('login')
        except Exception as e:
            print(f"❌ Error al crear usuario: {e}")
            import traceback
            traceback.print_exc()
            return render(request, 'register.html', {'error': f'Error al registrar: {str(e)}'})
    
    return render(request, 'register.html')

def login_view(request):
    if request.method == 'POST':
        correo = request.POST.get('correo')
        password = request.POST.get('password')
        
        print(f"🔍 LOGIN - Intentando con:")
        print(f"   Correo: '{correo}'")
        print(f"   Password: '{password}' (longitud: {len(password) if password else 0})")
        
        try:
            user = CustomUser.objects.get(email=correo)
            print(f"✅ Usuario encontrado: {user.email}")
            print(f"   ID: {user.id}")
            
            password_check = user.check_password(password)
            print(f"   Verificación de password: {password_check}")
            
            if password_check:
                auth_login(request, user)
                print(f"✅ Login exitoso: {user.email}")
                return redirect('platform')
            else:
                print("❌ Contraseña incorrecta")
                return render(request, 'login.html', {'error': 'Correo o contraseña incorrectos'})
        except CustomUser.DoesNotExist:
            print("❌ Usuario no encontrado")
            return render(request, 'login.html', {'error': 'Correo o contraseña incorrectos'})
    
    return render(request, 'login.html')

@login_required(login_url='login')
def platform(request):
    categories = Category.objects.filter(user=request.user).order_by('-created_at')
    
    total_documents = Document.objects.filter(user=request.user).count()
    total_categories = categories.count()
    
    today = timezone.now().date()
    documents_today = Document.objects.filter(
        user=request.user,
        uploaded_at__date=today
    ).count()
    
    total_size = Document.objects.filter(user=request.user).aggregate(
        total=Sum('size')
    )['total'] or 0
    
    if total_size < 1024:
        size_display = f"{total_size} B"
    elif total_size < 1024 * 1024:
        size_display = f"{total_size / 1024:.0f} KB"
    elif total_size < 1024 * 1024 * 1024:
        size_display = f"{total_size / (1024 * 1024):.2f} MB"
    else:
        size_display = f"{total_size / (1024 * 1024 * 1024):.2f} GB"
    
    context = {
        'categories': categories,
        'total_documents': total_documents,
        'total_categories': total_categories,
        'documents_today': documents_today,
        'size_display': size_display,
    }
    
    return render(request, 'plataform.html', context)

def logout_view(request):
    auth_logout(request)
    return redirect('login')

@login_required(login_url='login')
def create_category(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            icon = data.get('icon', '📁')
            
            if not name or not name.strip():
                return JsonResponse({'success': False, 'error': 'El nombre es obligatorio'}, status=400)
            
            category = Category.objects.create(
                user=request.user,
                name=name.strip(),
                icon=icon
            )
            
            return JsonResponse({
                'success': True,
                'category': {
                    'id': category.id,
                    'name': category.name,
                    'icon': category.icon,
                    'document_count': category.document_count()
                }
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@login_required(login_url='login')
def delete_category(request, category_id):
    if request.method == 'DELETE':
        try:
            category = Category.objects.get(id=category_id, user=request.user)
            category.delete()
            return JsonResponse({'success': True})
        except Category.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Categoría no encontrada'}, status=404)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@login_required(login_url='login')
def get_user_categories(request):
    """Obtener categorías del usuario"""
    try:
        categories = Category.objects.filter(user=request.user).order_by('name')
        
        categories_data = []
        for category in categories:
            categories_data.append({
                'id': category.id,
                'name': category.name,
                'icon': category.icon,
                'document_count': category.document_count()
            })
        
        return JsonResponse({'success': True, 'categories': categories_data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@login_required(login_url='login')
@csrf_exempt
def upload_document(request):
    print(f"📤 SUBIENDO DOCUMENTO - Usuario: {request.user.email}")
    print(f"📤 Método: {request.method}")
    
    if request.method == 'POST':
        try:
            # DEBUG: Ver qué está llegando
            print(f"📤 Keys en FILES: {list(request.FILES.keys())}")
            print(f"📤 Keys en POST: {list(request.POST.keys())}")
            
            # Intentar diferentes formas de obtener los archivos
            files = []
            if 'files[]' in request.FILES:
                files = request.FILES.getlist('files[]')
            elif 'files' in request.FILES:
                files = request.FILES.getlist('files')
            elif 'file' in request.FILES:
                files = [request.FILES['file']]
            else:
                # Tomar todos los archivos disponibles
                for key in request.FILES.keys():
                    files.extend(request.FILES.getlist(key))
            
            print(f"📤 Archivos encontrados: {len(files)}")
            
            if not files:
                print("❌ No se recibieron archivos")
                return JsonResponse({'success': False, 'error': 'No se recibieron archivos'}, status=400)
            
            # Obtener otros datos
            category_id = request.POST.get('category', 'none')
            tags = request.POST.get('tags', '')
            notes = request.POST.get('notes', '')
            
            print(f"📤 Datos recibidos:")
            print(f"  - Categoría ID: {category_id}")
            print(f"  - Tags: {tags}")
            print(f"  - Notes: {notes}")
            
            # Buscar categoría
            category = None
            if category_id and category_id != 'none' and category_id != 'undefined':
                try:
                    # Primero intentar por ID
                    if category_id.isdigit():
                        category = Category.objects.get(id=int(category_id), user=request.user)
                        print(f"✅ Categoría encontrada por ID: {category.name}")
                    else:
                        # Si no es número, podría ser el nombre directamente
                        category_name = category_id
                        # Buscar por nombre exacto
                        category = Category.objects.filter(
                            user=request.user,
                            name__iexact=category_name
                        ).first()
                        if category:
                            print(f"✅ Categoría encontrada por nombre: {category.name}")
                        else:
                            print(f"⚠️  Categoría no encontrada: {category_name}")
                except (Category.DoesNotExist, ValueError) as e:
                    print(f"⚠️  Error al buscar categoría: {e}")
                    category = None
            
            uploaded_docs = []
            for file in files:
                print(f"📤 Procesando archivo: {file.name} ({file.size} bytes)")
                
                # Validar tamaño - aumentado a 100MB
                if file.size > 100 * 1024 * 1024:
                    print(f"❌ Archivo demasiado grande: {file.name}")
                    return JsonResponse({
                        'success': False, 
                        'error': f'El archivo {file.name} es demasiado grande (máximo 100MB)'
                    }, status=400)
                
                # Obtener nombre base sin extensión
                file_name_without_ext = os.path.splitext(file.name)[0]
                # Crear un nombre seguro para Cloudinary
                safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', file_name_without_ext)
                
                # Subir a Cloudinary como RAW explícitamente
                upload_result = cloudinary.uploader.upload(
                    file,
                    folder="documents/",
                    resource_type="raw",
                    public_id=f"documents/{request.user.id}_{int(time.time())}_{safe_name}",
                    overwrite=True,
                    use_filename=False,  # No usar el nombre del archivo automáticamente
                    unique_filename=True,
                    invalidate=True
                )
                
                print(f"✅ Resultado completo de Cloudinary: {upload_result}")
                print(f"✅ Public ID: {upload_result.get('public_id')}")
                print(f"✅ URL segura: {upload_result.get('secure_url')}")
                print(f"✅ Versión: {upload_result.get('version')}")
                print(f"✅ Resource type: {upload_result.get('resource_type')}")
                
                # Crear documento
                doc = Document.objects.create(
                    user=request.user,
                    category=category,
                    name=file.name,
                    file=upload_result['public_id'],
                    size=file.size,
                    notes=notes,
                    tags=tags
                )
                
                print(f"✅ Documento creado en BD: {doc.id} - {doc.name}")
                print(f"✅ File field value: {doc.file}")
                
                uploaded_docs.append({
                    'id': doc.id,
                    'name': doc.name,
                    'size': doc.get_size_display(),
                    'icon': doc.get_icon(),
                    'date': doc.uploaded_at.strftime('%Y-%m-%d'),
                    'category': category.name if category else 'Sin categoría',
                    'category_slug': category.name.lower().replace(' ', '-') if category else 'otros'
                })
            
            print(f"✅ Subida completada exitosamente. Total: {len(uploaded_docs)} documentos")
            
            return JsonResponse({
                'success': True,
                'message': f'Se subieron {len(uploaded_docs)} documentos exitosamente',
                'documents': uploaded_docs
            })
            
        except Exception as e:
            print(f"❌ Error en upload_document: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    print("❌ Método no permitido")
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@login_required(login_url='login')
def get_documents(request):
    """Obtener todos los documentos del usuario"""
    try:
        documents = Document.objects.filter(user=request.user).order_by('-uploaded_at')
        
        docs_data = []
        for doc in documents:
            # Obtener la URL del archivo
            file_url = None
            try:
                # Generar URL de Cloudinary
                file_url = cloudinary.utils.cloudinary_url(
                    str(doc.file),
                    resource_type="raw"
                )[0]
            except:
                file_url = "#"
            
            docs_data.append({
                'id': doc.id,
                'name': doc.name,
                'size': doc.get_size_display(),
                'date': doc.uploaded_at.strftime('%Y-%m-%d'),
                'icon': doc.get_icon(),
                'category': doc.category.name if doc.category else 'Sin categoría',
                'category_slug': doc.category.name.lower().replace(' ', '-') if doc.category else 'otros',
                'url': file_url
            })
        
        return JsonResponse({'success': True, 'documents': docs_data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required(login_url='login')
def get_recent_documents(request):
    """Obtener documentos recientes (últimos 7 días)"""
    try:
        seven_days_ago = timezone.now() - timedelta(days=7)
        documents = Document.objects.filter(
            user=request.user,
            uploaded_at__gte=seven_days_ago
        ).order_by('-uploaded_at')[:10]  # Últimos 10 documentos
        
        docs_data = []
        for doc in documents:
            # Obtener la URL del archivo
            file_url = None
            try:
                file_url = cloudinary.utils.cloudinary_url(
                    str(doc.file),
                    resource_type="raw"
                )[0]
            except:
                file_url = "#"
            
            docs_data.append({
                'id': doc.id,
                'name': doc.name,
                'size': doc.get_size_display(),
                'date': doc.uploaded_at.strftime('%Y-%m-%d'),
                'icon': doc.get_icon(),
                'category': doc.category.name if doc.category else 'Sin categoría',
                'category_slug': doc.category.name.lower().replace(' ', '-') if doc.category else 'otros',
                'url': file_url
            })
        
        return JsonResponse({'success': True, 'documents': docs_data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required(login_url='login')
def download_document(request, document_id):
    """Descargar un documento - VERSIÓN SIMPLIFICADA Y FUNCIONAL"""
    try:
        document = Document.objects.get(id=document_id, user=request.user)
        
        print(f"📥 Descargando documento: {document.name}")
        
        # OPCIÓN 1: Usar la URL directa del campo Cloudinary y modificarla
        if hasattr(document.file, 'url'):
            file_url = document.file.url
            
            # Verificar si ya es una URL de Cloudinary
            if 'res.cloudinary.com' in file_url:
                # Insertar fl_attachment después de /upload/ para forzar descarga
                if '/upload/' in file_url:
                    # Reemplazar solo la primera ocurrencia
                    parts = file_url.split('/upload/', 1)
                    download_url = parts[0] + '/upload/fl_attachment/' + parts[1]
                    
                    # Asegurarse de que no haya duplicación de 'documents/'
                    download_url = download_url.replace('/documents/documents/', '/documents/')
                    
                    print(f"🔗 URL generada: {download_url}")
                    return redirect(download_url)
        
        # OPCIÓN 2: Si no funciona la opción 1, construir URL manualmente
        cloud_name = 'def1jabap'  # Tu cloud name
        
        # Obtener el public_id correctamente
        if hasattr(document.file, 'public_id'):
            public_id = document.file.public_id
        else:
            public_id = str(document.file)
        
        print(f"📥 Public ID: {public_id}")
        
        # Limpiar el public_id - quitar prefijos innecesarios
        if public_id.startswith('v1/'):
            public_id = public_id[3:]  # Remover "v1/"
        
        # Asegurarse de que solo tenga un prefijo "documents/"
        if public_id.startswith('documents/'):
            # Ya tiene el prefijo correcto
            clean_public_id = public_id
        else:
            # Agregar el prefijo
            clean_public_id = f"documents/{public_id}"
        
        print(f"📥 Clean Public ID: {clean_public_id}")
        
        # Construir URL directa para descarga
        download_url = f"https://res.cloudinary.com/{cloud_name}/raw/upload/fl_attachment/{clean_public_id}"
        
        print(f"🔗 URL final: {download_url}")
        return redirect(download_url)
        
    except Document.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Documento no encontrado'}, status=404)
    except Exception as e:
        print(f"❌ Error al descargar documento: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@login_required(login_url='login')
def delete_document(request, document_id):
    """Eliminar un documento"""
    if request.method == 'DELETE':
        try:
            document = Document.objects.get(id=document_id, user=request.user)
            
            # Eliminar de Cloudinary primero
            try:
                cloudinary.uploader.destroy(str(document.file), resource_type="raw")
                print(f"🗑️  Archivo eliminado de Cloudinary: {document.file}")
            except Exception as e:
                print(f"⚠️  No se pudo eliminar de Cloudinary (puede que ya no exista): {e}")
            
            # Eliminar de la base de datos
            document.delete()
            
            return JsonResponse({'success': True, 'message': 'Documento eliminado'})
        except Document.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Documento no encontrado'}, status=404)
        except Exception as e:
            print(f"❌ Error al eliminar documento: {e}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@login_required(login_url='login')
def test_document_url(request, document_id):
    """Función de diagnóstico para probar URLs de documentos"""
    try:
        document = Document.objects.get(id=document_id, user=request.user)
        
        public_id = str(document.file)
        
        # Diferentes formas de generar URLs
        urls = []
        
        # Método 1: cloudinary.utils.cloudinary_url básico
        try:
            url1, _ = cloudinary.utils.cloudinary_url(
                public_id,
                resource_type="raw"
            )
            urls.append(("Método 1 (básico)", url1))
        except Exception as e:
            urls.append(("Método 1 (básico)", f"Error: {e}"))
        
        # Método 2: Con attachment
        try:
            url2, _ = cloudinary.utils.cloudinary_url(
                public_id,
                resource_type="raw",
                flags="attachment",
                attachment=document.name
            )
            urls.append(("Método 2 (con attachment)", url2))
        except Exception as e:
            urls.append(("Método 2 (con attachment)", f"Error: {e}"))
        
        # Método 3: Manual sin versión
        clean_public_id = re.sub(r'^v\d+/', '', public_id)
        url3 = f"https://res.cloudinary.com/def1jabap/raw/upload/{clean_public_id}"
        urls.append(("Método 3 (manual sin versión)", url3))
        
        # Método 4: Manual con attachment
        url4 = f"https://res.cloudinary.com/def1jabap/raw/upload/fl_attachment/{clean_public_id}"
        urls.append(("Método 4 (manual con attachment)", url4))
        
        # Método 5: Si tiene versión explícita
        version_match = re.search(r'^v(\d+)/', public_id)
        if version_match:
            version = version_match.group(1)
            clean_id = re.sub(r'^v\d+/', '', public_id)
            url5 = f"https://res.cloudinary.com/def1jabap/raw/upload/v{version}/{clean_id}"
            urls.append((f"Método 5 (con versión {version})", url5))
        
        context = {
            'document': document,
            'public_id': public_id,
            'clean_public_id': clean_public_id,
            'urls': urls,
        }
        
        return render(request, 'test_urls.html', context)
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})