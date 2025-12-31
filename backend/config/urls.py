# backend/config/urls.py
from django.contrib import admin
from django.urls import path
from strawberry.django.views import GraphQLView

from .schema import schema

urlpatterns = [
    path("admin/", admin.site.urls),
    # GraphQLのエンドポイントを追加
    path("graphql", GraphQLView.as_view(schema=schema)),
]
