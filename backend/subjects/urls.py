from django.urls import path
from . import views

urlpatterns = [
    path('', views.SubjectListCreateView.as_view(), name='subject-list'),
    path('<int:pk>/', views.SubjectDetailView.as_view(), name='subject-detail'),
    path('allocations/', views.SubjectAllocationListCreateView.as_view(), name='subject-allocation-list'),
    path(
    'allocations/<int:pk>/',
    views.SubjectAllocationDeleteView.as_view(),
    name='subject-allocation-delete'),
]
