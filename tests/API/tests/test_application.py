import pytest
import requests  # <-- Needs to be plural
from requests import codes
from tests.API.lib.get_buckets import GetBuckets


class TestApplication:

    def test_application_get_buckets(self): 
       """Validate that the table names were updated properly"""
       session = requests.Session()
       get_buckets = GetBuckets(session)

       buckets = get_buckets.fetch_buckets(bucket='declined')
       assert get_buckets.status_code == codes.ok
       assert get_buckets.total_cnt is not None

       buckets = get_buckets.fetch_buckets(bucket='unresponsive')
       assert get_buckets.status_code == codes.ok
       assert get_buckets.total_cnt is not None

       buckets = get_buckets.fetch_buckets(bucket='disappointed')
       assert get_buckets.status_code == codes.ok
       assert get_buckets.total_cnt is not None
