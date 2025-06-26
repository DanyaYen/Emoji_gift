# backend/core/views.py
from django.http import HttpResponse

def hello_world(request):
    return HttpResponse("Hello, World! Django routing is working.")