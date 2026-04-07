#!/usr/bin/env python3
"""
Simple script to test OpenAI API key configuration
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get the API key from environment
api_key = os.getenv("OPEN_AI_KEY")

if not api_key:
    print("❌ Error: OPEN_AI_KEY not found in .env file")
    exit(1)

print("✓ API key found in .env file")
print(f"  Key preview: {api_key[:20]}...{api_key[-10:]}")

try:
    # Try to import and initialize OpenAI client
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    print("✓ OpenAI client successfully initialized")

    # Make a simple test request
    print("\n📝 Testing API with a simple request...")
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {
                "role": "user",
                "content": "Say 'API test successful' in exactly those words.",
            }
        ],
        max_tokens=50,
    )

    result = response.choices[0].message.content
    print(f"✓ API test successful!")
    print(f"  Response: {result}")
    print(f"\n✅ Your OpenAI API key is working correctly!")

except ImportError:
    print("❌ Error: openai package not installed")
    print("   Install it with: pip install openai")
    exit(1)
except Exception as e:
    print(f"❌ Error testing API: {str(e)}")
    print(f"\n   This could be due to:")
    print(f"   - Invalid API key")
    print(f"   - No API credits")
    print(f"   - Network issue")
    exit(1)
