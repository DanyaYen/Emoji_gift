from rest_framework import serializers

class UserRegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6) 

class TransactionCreateSerializer(serializers.Serializer):
    recipient_email = serializers.EmailField() 
    amount = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=100)

class PurchaseItemSerializer(serializers.Serializer):
    item_id = serializers.CharField()


class GiftSerializer(serializers.Serializer):
    recipient_email = serializers.EmailField()
    item_id = serializers.CharField()