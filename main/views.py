from django.shortcuts import render
from django.http import HttpResponse
from django.core.mail import send_mail
from django.http import JsonResponse


def index(request):
    return render(request, 'index.html')