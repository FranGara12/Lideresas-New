from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from main import views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Páginas principales
    path('', views.index, name='index'),
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('platform/', views.platform, name='platform'),

    # Categorías
    path('api/categories/create/', views.create_category, name='create_category'),
    path('api/categories/<int:category_id>/delete/', views.delete_category, name='delete_category'),

    # Documentos
    path('api/documents/upload/', views.upload_document, name='upload_document'),
    path('api/documents/', views.get_documents, name='get_documents'),
    path('api/documents/recent/', views.get_recent_documents, name='get_recent_documents'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

