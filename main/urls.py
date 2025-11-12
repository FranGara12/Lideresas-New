from django.contrib import admin
from django.urls import path
from main import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Páginas principales
    path('', views.index, name='index'),
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('platform/', views.platform, name='platform'),  # ← CORREGIDO: nombre consistente
]
