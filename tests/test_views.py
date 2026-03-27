import pytest
from datetime import date

from django.shortcuts import reverse
from rest_framework.test import APIClient

from map.models import CommunityArea, RestaurantPermit


@pytest.mark.django_db
def test_map_data_view():
    # Create some test community areas
    area1 = CommunityArea.objects.create(name="Beverly", area_id="1")
    area2 = CommunityArea.objects.create(name="Lincoln Park", area_id="2")

    # Test permits for Beverly
    RestaurantPermit.objects.create(
        community_area_id=area1.area_id, issue_date=date(2021, 1, 15)
    )
    RestaurantPermit.objects.create(
        community_area_id=area1.area_id, issue_date=date(2021, 2, 20)
    )

    # Test permits for Lincoln Park
    RestaurantPermit.objects.create(
        community_area_id=area2.area_id, issue_date=date(2021, 3, 10)
    )
    RestaurantPermit.objects.create(
        community_area_id=area2.area_id, issue_date=date(2021, 2, 14)
    )
    RestaurantPermit.objects.create(
        community_area_id=area2.area_id, issue_date=date(2021, 6, 22)
    )

    # Query the map data endpoint
    client = APIClient()
    response = client.get(reverse("map_data", query={"year": 2021}))

    # Asserting that the /map-data/ endpoint returns the correct number of permits for Beverly and Lincoln Park in 2021

    assert response.status_code == 200
    data = response.json()

    # Assert that we have data for both community areas
    assert len(data) == 2

    # Assert that the data for each community area is correct
    beverly_data = next((item for item in data if item["name"] == "Beverly"), None)
    lincoln_park_data = next((item for item in data if item["name"] == "Lincoln Park"), None)

    assert beverly_data is not None
    assert lincoln_park_data is not None

    # Assert the number of permits for each community area
    assert beverly_data["num_permits"] == 2
    assert lincoln_park_data["num_permits"] == 3

    # Add tests for the /permits-by-year/ endpoint
    response = client.get(reverse("permits_by_year", query={"area_id": area1.area_id}))     
    assert response.status_code == 200
    permit_data = response.json()

    # Assert that we have data for the correct neighborhood
    assert permit_data["neighborhood"] == "Beverly"

    # Assert that we have permit counts for the correct years
    assert len(permit_data["permits_by_year"]) >= 1

    # Assert that the permit counts are correct for the years we have data for
    beverly_permits_2021 = next((item for item in permit_data["permits_by_year"] if item["year"] == 2021), None)

    assert beverly_permits_2021 is not None
    assert beverly_permits_2021["count"] == 2