from django.urls import path

from .views import CsrfView, CurrentUserView, GoogleSignInView, LogoutView

urlpatterns = [
    path("csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("google/", GoogleSignInView.as_view(), name="auth-google"),
    path("me/", CurrentUserView.as_view(), name="auth-me"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
]
