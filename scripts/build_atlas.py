import subprocess

print("🌍 Building World Cup Atlas...\n")

steps = [
    "scripts/make_countries.py",
]

for step in steps:
    print(f"Running {step}...")
    subprocess.run(["python3", step], check=True)

print("\n✅ Atlas build complete!")