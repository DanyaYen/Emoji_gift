
from django.contrib import admin
from django.urls import path, include

from api.views import (
    UserRegisterView,
    StoreListView,
    TransactionCreateView,
    ProfileView,
    GiftItemView,
    PurchaseItemView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('metrics/', include('django_prometheus.urls')),
    path('api/register/', UserRegisterView.as_view(), name='register'),
    path('api/store/', StoreListView.as_view(), name='store-list'),
    path('api/transactions/', TransactionCreateView.as_view(), name='create-transaction'),
    path('api/profile/', ProfileView.as_view(), name='profile'),
    path('api/purchase/', PurchaseItemView.as_view(), name='purchase-item'),
    path('api/gift/', GiftItemView.as_view(), name='gift-item'),
]