# check_env.py
import os

# Get the directory where this script is being run from
current_directory = os.getcwd()
print(f"--- Running Diagnostic from Directory: {current_directory}")

# Define the expected paths for your folders relative to the script
static_folder_path = os.path.join(current_directory, 'static')
templates_folder_path = os.path.join(current_directory, 'templates')

# Check for the 'static' folder
print(f"\n--- Checking for 'static' folder...")
print(f"Expected path: {static_folder_path}")
if os.path.isdir(static_folder_path):
    print("✅ SUCCESS: 'static' folder was found.")
else:
    print("❌ FAILED: 'static' folder was NOT found at this path.")

# Check for the 'templates' folder
print(f"\n--- Checking for 'templates' folder...")
print(f"Expected path: {templates_folder_path}")
if os.path.isdir(templates_folder_path):
    print("✅ SUCCESS: 'templates' folder was found.")
else:
    print("❌ FAILED: 'templates' folder was NOT found at this path.")

print("\n--- End of Diagnostic ---")