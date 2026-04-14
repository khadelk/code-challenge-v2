from rest_framework import serializers

from map.models import CommunityArea, RestaurantPermit

class CommunityAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityArea
        fields = ["area_id", "name", "num_permits"]

    num_permits = serializers.SerializerMethodField()

    # Supplement each community area object with the number of permits issued in the given year.
    def get_num_permits(self, obj):

        # get the year from the request context
        year = self.context.get("year")

        if year:
            # filter the restaurant permits by the given year and community area
            restaurant_permits = RestaurantPermit.objects.filter(
                community_area_id=obj.area_id,
                issue_date__year=int(year)
            )
        else:
            restaurant_permits = RestaurantPermit.objects.filter(community_area_id=obj.area_id)

        return restaurant_permits.count()