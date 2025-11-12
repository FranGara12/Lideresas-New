from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import CustomUser

class RegistroForm(UserCreationForm):
    class Meta:
        model = CustomUser
        fields = ["first_name", "last_name", "email", "password1", "password2"]

class LoginForm(AuthenticationForm):
    username = forms.EmailField(label="Correo electrónico")
