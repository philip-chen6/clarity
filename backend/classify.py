import google.generativeai as genai
import PIL.Image
import os
import sys
from dotenv import load_dotenv

load_dotenv()

def classify_pill(image_path):
    """
    Classifies a pill from an image using the Gemini API.
    """
    # Configure the Gemini API key
    # Make sure to set the GOOGLE_API_KEY environment variable
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set.")
    genai.configure(api_key=api_key)

    # Create the model
    model = genai.GenerativeModel('models/gemini-2.5-flash-image')

    # Load the image
    try:
        img = PIL.Image.open(image_path)
    except FileNotFoundError:
        return f"Error: Image file not found at {image_path}"

    # Make the API call
    response = model.generate_content(["Analyze the image and describe the pill shown. What are its physical characteristics (shape, color)? What text or numbers are imprinted on it? Based *only* on the visual information, what medication does the imprint suggest this might be? If you can't tell what the pill is, give your best guess. Frame the response as a visual analysis, not medical advice.", img])

    return response.text

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python classify.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    result = classify_pill(image_path)
    print(result)
