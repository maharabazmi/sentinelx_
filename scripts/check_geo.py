import re

with open('src/data/bangladeshGeo.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Match division level objects: they have id, name, nameBn, districts
div_matches = re.findall(r"{\s*id:\s*'([a-z0-9_-]+)',\s*name:\s*'([A-Za-z\s]+)',\s*nameBn:[^,]+,\s*districts:\s*\[", text)
print("Divisions found:", div_matches)

# Also check if Mymensingh is anywhere in the file
print("Is 'Mymensingh' in bangladeshGeo.ts?", "Mymensingh".lower() in text.lower())
print("Is 'Fulbaria' in bangladeshGeo.ts?", "Fulbaria".lower() in text.lower())
print("Is 'Rangpur' in bangladeshGeo.ts?", "Rangpur".lower() in text.lower())
