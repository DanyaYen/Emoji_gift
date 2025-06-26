from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from firebase_admin import auth, firestore

from .serializers import (
    UserRegisterSerializer,
    TransactionCreateSerializer,
    PurchaseItemSerializer,
    GiftSerializer,
)

db = firestore.client()

class UserRegisterView(APIView):
    def post(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response(
                {'error': 'Authorization token not found or malformed'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        id_token = auth_header.split('Bearer ')[1]

        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            email = decoded_token.get('email')

            user_doc_ref = db.collection('users').document(uid)
            if user_doc_ref.get().exists:
                return Response(
                    {'error': 'User document already exists in Firestore'},
                    status=status.HTTP_409_CONFLICT
                )

            user_doc_ref.set({
                'email': email,
                'balance': 10000,
                'owned_items': []
            })

            return Response({'uid': uid, 'email': email}, status=status.HTTP_201_CREATED)

        except auth.InvalidIdTokenError:
            return Response({'error': 'Invalid ID token'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StoreListView(APIView):
    permission_classes = [permissions.AllowAny] 

    def get(self, request):
        try:
            items_ref = db.collection('store_items').stream()
            store_items = []
            for item in items_ref:
                item_data = item.to_dict()
                item_data['id'] = item.id 
                store_items.append(item_data)
            return Response(store_items, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransactionCreateView(APIView):
    def post(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

        id_token = auth_header.split('Bearer ')[1]
        serializer = TransactionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        amount_to_send = data['amount']
        recipient_email = data['recipient_email']
        title = data['title']

        try:
            decoded_token = auth.verify_id_token(id_token)
            sender_id = decoded_token['uid']
            users_ref = db.collection('users')
            recipient_query = users_ref.where('email', '==', recipient_email).limit(1).stream()
            recipient_list = list(recipient_query)

            if not recipient_list:
                return Response({'error': 'Recipient not found'}, status=status.HTTP_404_NOT_FOUND)

            recipient_id = recipient_list[0].id

            if sender_id == recipient_id:
                return Response({'error': 'Cannot send money to yourself'}, status=status.HTTP_400_BAD_REQUEST)

            sender_ref = users_ref.document(sender_id)
            recipient_ref = users_ref.document(recipient_id)

            @firestore.transactional
            def process_transaction(transaction):
                sender_snapshot = sender_ref.get(transaction=transaction)
                if not sender_snapshot.exists: raise Exception("Sender not found in Firestore")

                sender_balance = sender_snapshot.get('balance')
                if sender_balance < amount_to_send:
                    raise ValueError('Insufficient funds')
                transaction.update(sender_ref, {'balance': firestore.Increment(-amount_to_send)})
                transaction.update(recipient_ref, {'balance': firestore.Increment(amount_to_send)})
                tx_ref = db.collection('transactions').document()
                transaction.set(tx_ref, {
                    'sender_id': sender_id,
                    'recipient_id': recipient_id,
                    'amount': amount_to_send,
                    'title': title,
                    'timestamp': firestore.SERVER_TIMESTAMP
                })

            process_transaction(db.transaction())
            return Response({'success': 'Transaction complete'}, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'An error occurred: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PurchaseItemView(APIView):
    def post(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

        id_token = auth_header.split('Bearer ')[1]
        serializer = PurchaseItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        item_id_to_purchase = serializer.validated_data['item_id']

        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']

            user_ref = db.collection('users').document(uid)
            item_ref = db.collection('store_items').document(item_id_to_purchase)

            @firestore.transactional
            def process_purchase(transaction):
                user_snapshot = user_ref.get(transaction=transaction)
                item_snapshot = item_ref.get(transaction=transaction)

                if not user_snapshot.exists: raise Exception("User not found")
                if not item_snapshot.exists: raise Exception("Item not found")

                user_data = user_snapshot.to_dict()
                item_data = item_snapshot.to_dict()

                user_balance = user_data.get('balance', 0)
                item_price = item_data.get('price', 0)

                if user_balance < item_price:
                    raise ValueError("Insufficient funds")
                new_balance = user_balance - item_price
                transaction.update(user_ref, {'balance': new_balance})
                transaction.update(user_ref, {
                    f'owned_items.{item_id_to_purchase}': firestore.Increment(1)
                })

                return new_balance

            final_balance = process_purchase(db.transaction())
            return Response({'success': 'Purchase successful', 'new_balance': final_balance})

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'An error occurred: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class ProfileView(APIView):
    def get(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response(
                {'error': 'Authorization token not found or malformed'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        id_token = auth_header.split('Bearer ')[1]

        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            user_doc = db.collection('users').document(uid).get()

            if not user_doc.exists:
                return Response({'error': 'User not found in Firestore'}, status=status.HTTP_404_NOT_FOUND)
            return Response(user_doc.to_dict(), status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class GiftItemView(APIView):
    def post(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

        id_token = auth_header.split('Bearer ')[1]
        serializer = GiftSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        recipient_email = data['recipient_email']
        item_id_to_gift = data['item_id']

        try:
            decoded_token = auth.verify_id_token(id_token)
            sender_id = decoded_token['uid']
            users_ref = db.collection('users')
            recipient_query = users_ref.where('email', '==', recipient_email).limit(1).stream()
            recipient_list = list(recipient_query)

            if not recipient_list:
                return Response({'error': 'Recipient not found'}, status=status.HTTP_404_NOT_FOUND)

            recipient_id = recipient_list[0].id

            if sender_id == recipient_id:
                return Response({'error': 'Cannot gift an item to yourself'}, status=status.HTTP_400_BAD_REQUEST)

            sender_ref = users_ref.document(sender_id)
            recipient_ref = users_ref.document(recipient_id)

            @firestore.transactional
            def process_gift(transaction):
                sender_snapshot = sender_ref.get(transaction=transaction)
                if not sender_snapshot.exists: raise Exception("Sender not found")

                sender_data = sender_snapshot.to_dict()
                sender_items = sender_data.get('owned_items', {})
                if sender_items.get(item_id_to_gift, 0) < 1:
                    raise ValueError("You do not own this item to gift.")
                transaction.update(sender_ref, {
                    f'owned_items.{item_id_to_gift}': firestore.Increment(-1)
                })
                transaction.update(recipient_ref, {
                    f'owned_items.{item_id_to_gift}': firestore.Increment(1)
                })
            process_gift(db.transaction())
            return Response({'success': f'Successfully gifted item {item_id_to_gift} to {recipient_email}'})

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'An error occurred: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
