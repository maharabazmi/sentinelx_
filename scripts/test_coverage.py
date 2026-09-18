import sys
sys.path.insert(0, '.')
from backend.services.geocoding_service import GeocodingService

tests = [
    ('assim', 'fulbaria', 'Mymensingh'),
    ('Teknaf Bazar', 'Teknaf', "Cox's Bazar"),
    ('Zero Point', 'Tetulia', 'Panchagarh'),
    ('Sea Beach', 'Kalapara', 'Patuakhali'),
    ('Tea Garden', 'Sreemangal', 'Moulvibazar'),
    ('Border Checkpost', 'Sharsha', 'Jashore'),
    ('Remote hill', 'Thanchi', 'Bandarban'),
    ('River port', 'Rowmari', 'Kurigram'),
    ('Grave of Lalon', 'Kumarkhali', 'Kushtia'),
    ('Unknown spot', 'nonexistent thana', 'Bagerhat'),
]

print("=== NATIONWIDE GEOCODING TEST RESULTS ===")
for loc, th, dist in tests:
    coords = GeocodingService.resolve_coordinates(loc, th, dist)
    print(f"{loc} [{th}, {dist}] -> {coords}")
