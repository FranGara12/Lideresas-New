from django.shortcuts import render, redirect
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from .models import CustomUser

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

        # Validar que todos los campos estén presentes
        if not all([nombre, apellido, correo, password]):
            print("❌ Faltan campos")
            return render(request, 'register.html', {'error': 'Todos los campos son obligatorios'})

        # Evitar registros duplicados
        if CustomUser.objects.filter(email=correo).exists():
            print("❌ Usuario ya existe")
            return render(request, 'register.html', {'error': 'El correo ya está registrado'})

        try:
            # Crear usuario
            user = CustomUser.objects.create_user(
                email=correo,
                password=password,
                first_name=nombre,
                last_name=apellido
            )
            print(f"✅ Usuario registrado exitosamente: {user.email}")
            print(f"   ID: {user.id}")
            print(f"   Password hash: {user.password[:50]}...")
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
            # Buscar usuario por email
            user = CustomUser.objects.get(email=correo)
            print(f"✅ Usuario encontrado: {user.email}")
            print(f"   ID: {user.id}")
            print(f"   Password hash guardado: {user.password[:50]}...")
            
            # Verificar contraseña
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
    return render(request, 'plataform.html')


def logout_view(request):
    auth_logout(request)
    return redirect('login')