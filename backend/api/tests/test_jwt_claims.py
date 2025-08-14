"""
Tests for JWT custom claims functionality.
"""
import jwt
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from api.models.role import UserRole
from api.serializers.jwt_serializers import CustomTokenObtainPairSerializer
from api.utils.jwt_utils import (
    decode_jwt_token, 
    get_user_info_from_token, 
    get_user_from_token_claims,
    should_refresh_token_claims
)

User = get_user_model()


class JWTCustomClaimsTest(TestCase):
    """Test JWT custom claims functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create default roles
        UserRole.create_default_roles()
        
        # Create test users
        self.owner_role = UserRole.objects.get(name='owner')
        self.user_role = UserRole.objects.get(name='user')
        
        self.owner_user = User.objects.create_user(
            username='testowner',
            email='owner@test.com',
            password='testpass123',
            first_name='Test',
            last_name='Owner',
            role=self.owner_role,
            is_staff=True,
            is_superuser=True
        )
        
        self.regular_user = User.objects.create_user(
            username='testuser',
            email='user@test.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role=self.user_role
        )
    
    def test_custom_token_serializer_adds_claims(self):
        """Test that the custom serializer adds user claims to tokens"""
        # Generate token for owner user
        token = CustomTokenObtainPairSerializer.get_token(self.owner_user)
        
        # Decode the token to check claims
        payload = jwt.decode(
            str(token),
            settings.SIMPLE_JWT['SIGNING_KEY'],
            algorithms=[settings.SIMPLE_JWT['ALGORITHM']]
        )
        
        # Check that custom claims are present
        self.assertIn('username', payload)
        self.assertIn('email', payload)
        self.assertIn('first_name', payload)
        self.assertIn('last_name', payload)
        self.assertIn('is_active', payload)
        self.assertIn('is_staff', payload)
        self.assertIn('is_superuser', payload)
        self.assertIn('role', payload)
        self.assertIn('role_details', payload)
        
        # Check claim values
        self.assertEqual(payload['username'], 'testowner')
        self.assertEqual(payload['email'], 'owner@test.com')
        self.assertEqual(payload['first_name'], 'Test')
        self.assertEqual(payload['last_name'], 'Owner')
        self.assertTrue(payload['is_active'])
        self.assertTrue(payload['is_staff'])
        self.assertTrue(payload['is_superuser'])
        self.assertEqual(payload['role'], 'owner')
        
        # Check role details
        role_details = payload['role_details']
        self.assertEqual(role_details['name'], 'owner')
        self.assertTrue(role_details['can_manage_users'])
        self.assertTrue(role_details['can_manage_system'])
        self.assertTrue(role_details['can_view_logs'])
    
    def test_token_claims_for_regular_user(self):
        """Test token claims for a regular user"""
        token = CustomTokenObtainPairSerializer.get_token(self.regular_user)
        
        payload = jwt.decode(
            str(token),
            settings.SIMPLE_JWT['SIGNING_KEY'],
            algorithms=[settings.SIMPLE_JWT['ALGORITHM']]
        )
        
        # Check regular user claims
        self.assertEqual(payload['username'], 'testuser')
        self.assertEqual(payload['email'], 'user@test.com')
        self.assertFalse(payload['is_staff'])
        self.assertFalse(payload['is_superuser'])
        self.assertEqual(payload['role'], 'user')
        
        # Check role details for regular user
        role_details = payload['role_details']
        self.assertEqual(role_details['name'], 'user')
        self.assertFalse(role_details['can_manage_users'])
        self.assertFalse(role_details['can_manage_system'])
        self.assertFalse(role_details['can_view_logs'])
    
    def test_token_claims_for_user_without_role(self):
        """Test token claims for a user without a role"""
        user_no_role = User.objects.create_user(
            username='noroleuser',
            email='norole@test.com',
            password='testpass123'
        )
        
        token = CustomTokenObtainPairSerializer.get_token(user_no_role)
        
        payload = jwt.decode(
            str(token),
            settings.SIMPLE_JWT['SIGNING_KEY'],
            algorithms=[settings.SIMPLE_JWT['ALGORITHM']]
        )
        
        # Check that role is None when user has no role
        self.assertIsNone(payload['role'])
        self.assertIsNone(payload['role_details'])
    
    def test_decode_jwt_token_utility(self):
        """Test the JWT token decoding utility function"""
        token = CustomTokenObtainPairSerializer.get_token(self.owner_user)
        
        # Test successful decoding
        payload = decode_jwt_token(str(token))
        self.assertIsNotNone(payload)
        self.assertEqual(payload['username'], 'testowner')
        
        # Test invalid token
        invalid_payload = decode_jwt_token('invalid.token.here')
        self.assertIsNone(invalid_payload)
    
    def test_get_user_info_from_token(self):
        """Test extracting user info from token claims"""
        token = CustomTokenObtainPairSerializer.get_token(self.owner_user)
        
        user_info = get_user_info_from_token(str(token))
        
        self.assertIsNotNone(user_info)
        self.assertEqual(user_info['username'], 'testowner')
        self.assertEqual(user_info['email'], 'owner@test.com')
        self.assertEqual(user_info['first_name'], 'Test')
        self.assertEqual(user_info['last_name'], 'Owner')
        self.assertTrue(user_info['is_staff'])
        self.assertTrue(user_info['is_superuser'])
        
        # Test with invalid token
        invalid_user_info = get_user_info_from_token('invalid.token')
        self.assertIsNone(invalid_user_info)
    
    def test_get_user_from_token_claims(self):
        """Test getting user object from token claims"""
        token = CustomTokenObtainPairSerializer.get_token(self.owner_user)
        
        user = get_user_from_token_claims(str(token))
        
        self.assertIsNotNone(user)
        self.assertEqual(user.username, 'testowner')
        self.assertEqual(user.email, 'owner@test.com')
        self.assertEqual(user.first_name, 'Test')
        self.assertEqual(user.last_name, 'Owner')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        
        # Check that role information is available
        self.assertIsNotNone(user.role)
        self.assertEqual(user.role.name, 'owner')
        self.assertTrue(user.role.can_manage_users)
    
    def test_should_refresh_token_claims(self):
        """Test the token claims refresh detection"""
        # Create a token with claims
        token = CustomTokenObtainPairSerializer.get_token(self.owner_user)
        
        # Fresh token should not need refresh
        should_refresh = should_refresh_token_claims(str(token))
        self.assertFalse(should_refresh)
        
        # Invalid token should need refresh
        should_refresh = should_refresh_token_claims('invalid.token')
        self.assertTrue(should_refresh)
    
    def test_token_claims_reduce_database_calls(self):
        """Test that using token claims reduces database queries"""
        token = CustomTokenObtainPairSerializer.get_token(self.owner_user)
        
        # Using token claims should require minimal database access
        with self.assertNumQueries(1):  # Only one query to verify user exists
            user = get_user_from_token_claims(str(token))
            self.assertIsNotNone(user)
            
            # Access user attributes that would normally require DB queries
            _ = user.username
            _ = user.email
            _ = user.first_name
            _ = user.last_name
            _ = user.is_staff
            _ = user.role.name if user.role else None
