from django.urls import path
from . import views

urlpatterns = [
    # Páginas principales
    path('', views.index, name='index'),
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('platform/', views.platform, name='platform'),
    path('logout/', views.logout_view, name='logout'),
    
    # API para categorías
    path('api/categories/create/', views.create_category, name='create_category'),
    path('api/categories/<int:category_id>/delete/', views.delete_category, name='delete_category'),
    path('api/categories/user/', views.get_user_categories, name='get_user_categories'),  # NUEVA
    
    # API para documentos
    path('api/documents/upload/', views.upload_document, name='upload_document'),
    path('api/documents/', views.get_documents, name='get_documents'),
    path('api/documents/recent/', views.get_recent_documents, name='get_recent_documents'),
]


