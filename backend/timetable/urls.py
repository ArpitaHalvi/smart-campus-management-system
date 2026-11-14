
from django.urls import path
from . import views

urlpatterns = [
    path('', views.TimetableListCreateView.as_view(), name='timetable-list-create'),
    path('my/', views.MyTimetableView.as_view(), name='my-timetable'),
    path('<int:pk>/', views.TimetableDetailView.as_view(), name='timetable-detail'),
]
