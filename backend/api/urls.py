from django.urls import path
from .views import UserRegisterView, StoreListView, TransactionCreateView, ProfileView, PurchaseItemView, GiftItemView 

urlpatterns = [
    path('register/', UserRegisterView.as_view(), name='register'),
    path('store/', StoreListView.as_view(), name='store-list'),
    path('transactions/', TransactionCreateView.as_view(), name='create-transaction'),
    path('profile/', ProfileView.as_view(), name='profile'), 
    path('purchase/', PurchaseItemView.as_view(), name='purchase-item'),
    path('gift/', GiftItemView.as_view(), name='gift-item'),
]