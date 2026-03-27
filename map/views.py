import os

from django.shortcuts import render
from django.views.generic import TemplateView
from django.db.models import Count

from rest_framework.views import APIView
from rest_framework.response import Response

from map.models import CommunityArea, RestaurantPermit
from map.serializers import CommunityAreaSerializer


class Home(TemplateView):
    template_name = "map/home_page.html"


class MapDataView(APIView):
    def get(self, request):
        community_areas = CommunityArea.objects.all()
        serializer = CommunityAreaSerializer(
            community_areas,
            many=True,
            context={"year": request.query_params.get("year")},
        )
        return Response(serializer.data)


class PermitsByYearView(APIView):
    def get(self, request):
        area_id = request.query_params.get("area_id")
        
        if not area_id:
            return Response({"error": "area_id query parameter is required"}, status=400)
        
        # Get the community area name
        try:
            community_area = CommunityArea.objects.get(area_id=area_id)
        except CommunityArea.DoesNotExist:
            return Response({"error": "Community area not found"}, status=404)
        
        # Get permits for the area grouped by year
        permits_by_year_qs = (
            RestaurantPermit.objects
            .filter(community_area_id=area_id)
            .extra(select={"year": "EXTRACT(year FROM issue_date)"})
            .values("year")
            .annotate(count=Count("id"))
            .order_by("year")
        )
        
        # Convert to dict for easier lookup and convert year to int
        permits_dict = {int(item["year"]): item["count"] for item in permits_by_year_qs}
        
        # Get min year from data, default to 2016
        min_year = min(permits_dict.keys()) if permits_dict else 2016
        max_year = 2026
        
        # Build complete year range with 0 counts for missing years
        permits_by_year = [
            {"year": year, "count": permits_dict.get(year, 0)}
            for year in range(min_year, max_year + 1)
        ]
        
        return Response({
            "neighborhood": community_area.name,
            "permits_by_year": permits_by_year
        })


def robots_txt(request):
    return render(
        request,
        "map/robots.txt",
        {"ALLOW_CRAWL": True if os.getenv("ALLOW_CRAWL") == "True" else False},
        content_type="text/plain",
    )


def page_not_found(request, exception, template_name="404.html"):
    return render(request, template_name, status=404)


def server_error(request, template_name="500.html"):
    return render(request, template_name, status=500)
