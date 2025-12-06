from django.http import HttpResponse

def hello(request):
    return HttpResponse("<h1>Hello World from Jilson Santana!</h1>")
