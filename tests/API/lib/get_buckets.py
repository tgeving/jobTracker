from requests import codes


class GetBuckets:
    def __init__(self, session):
        """Initialize the GetBuckets instance with the base URL.
        Args:
            session (requests.Session): The session object to use for making API requests.
        """


        self.base_url = 'http://localhost:8000'
        self._jobs_url = f"{self.base_url}/api/jobs"
        self._session = session
        self._status_code = None
        self._total_cnt = None
        self._items = None

    @property
    def status_code(self):
        """Return the status code of the response."""
        return self._status_code

    @property
    def total_cnt(self):
        """Return the total count of items in the response."""
        return self._total_cnt

    @property
    def items(self):
        """Return the items in the response."""
        return self._items

    def fetch_buckets(self, session=None, bucket=None):
        """Fetch buckets from the API. If a specific bucket is provided, fetch that bucket
        Args:
            session (requests.Session, optional): The session object to use for making API requests. Defaults to self._session
            bucket (str, optional): The specific bucket to fetch. Defaults to None. i.e 'applied, disappointed, i_rejected_them, etc'
        """
        session = session or self._session
        res = session.get(f"{self._jobs_url}/{bucket}")
        self._status_code = res.status_code

        if res.status_code == codes.ok:
            jres = res.json()
            self._items = jres['items']
            self._total_cnt = jres['total']
            return jres
