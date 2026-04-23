from rest_framework import serializers
from .models import Wallet, WalletTransaction


class WalletTransactionSerializer(serializers.ModelSerializer):
    related_user_name  = serializers.CharField(source='related_user.name',  read_only=True, default='')
    related_guard_name = serializers.CharField(source='related_guard.name', read_only=True, default='')
    bank_account_name  = serializers.SerializerMethodField()
    txn_type_display   = serializers.CharField(source='get_txn_type_display', read_only=True)

    def get_bank_account_name(self, obj):
        if obj.bank_account:
            return f"{obj.bank_account.account_name} ({obj.bank_account.bank_name})"
        return ''

    class Meta:
        model  = WalletTransaction
        fields = [
            'id', 'wallet', 'amount', 'txn_type', 'txn_type_display',
            'balance_after', 'source', 'bank_account', 'bank_account_name',
            'related_user', 'related_user_name',
            'related_guard', 'related_guard_name',
            'note', 'created_at',
        ]
        read_only_fields = [
            'id', 'balance_after', 'txn_type_display',
            'related_user_name', 'related_guard_name',
            'bank_account_name', 'created_at',
        ]


class WalletSerializer(serializers.ModelSerializer):
    user_name    = serializers.CharField(source='user.name', read_only=True)
    transactions = WalletTransactionSerializer(many=True, read_only=True)

    class Meta:
        model  = Wallet
        fields = ['id', 'user', 'user_name', 'balance', 'updated_at', 'transactions']
        read_only_fields = ['id', 'user_name', 'balance', 'updated_at', 'transactions']
