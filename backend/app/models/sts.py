import scrapetube
import json

channel_id = "UCr-SaoUP7SSo1LQbhcmVZ7w"

# Get all videos (generators are memory efficient)
videos = list(scrapetube.get_channel(channel_id))

print(f"Total videos found: {len(videos)}")

# Save to JSON file
with open("all_videos.json", "w") as f:
    json.dump(videos, f, indent=2)

# Also print them
for i, video in enumerate(videos, 1):
    print(f"{i}. https://www.youtube.com/watch?v={video['videoId']}")