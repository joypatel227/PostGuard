from rest_framework import serializers
from .models import Wallet, WalletTransaction


class WalletTransactionSerializer(serializers.ModelSerializer):
    related_user_name  = serializers.CharField(source='related_user.name', read_only=True, default='')
    related_guard_name = serializers.CharField(source='related_guard.name', read_only=True, default='')

    class Meta:
        model  = WalletTransaction
        fields = ['id', 'wallet', 'amount', 'txn_type', 'balance_after',
                  'related_user', 'related_user_name', 'related_guard',
                  'related_guard_name', 'note', 'created_at']
        read_only_fields = ['id', 'balance_after', 'related_user_name',
                            'related_guard_name', 'created_at']


class WalletSerializer(serializers.ModelSerializer):
    user_name    = serializers.CharField(source='user.name', read_only=True)
    transactions = WalletTransactionSerializer(many=True, read_only=True)

    class Meta:
        model  = Wallet
        fields = ['id', 'user', 'user_name', 'balance', 'updated_at', 'transactions']
        read_only_fields = ['id', 'user_name', 'balance', 'updated_at', 'transactions']
