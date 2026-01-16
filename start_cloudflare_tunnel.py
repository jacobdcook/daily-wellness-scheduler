"""
Start Cloudflare Tunnel to expose your local app to the internet
"""
import subprocess
import os
import sys
import time

def main():
    print("🌐 Starting Cloudflare Tunnel...")
    print("This will create a public URL for your local app")
    print("=" * 60)
    
    # Get the path to cloudflared.exe
    cloudflared_path = os.path.join(os.getcwd(), "cloudflared.exe")
    
    if not os.path.exists(cloudflared_path):
        print(f"❌ Error: cloudflared.exe not found at {cloudflared_path}")
        print("Please make sure cloudflared.exe is in the project root directory")
        sys.exit(1)
    
    # Frontend runs on port 3000
    # The frontend proxies /backend requests to localhost:8000
    local_port = 3000
    
    print(f"\n📡 Tunneling localhost:{local_port} to Cloudflare...")
    print("⏳ This may take a few seconds...")
    print("\n" + "=" * 60)
    
    try:
        # Run cloudflared tunnel
        # --url flag creates a quick tunnel to localhost:3000
        process = subprocess.Popen(
            [cloudflared_path, "tunnel", "--url", f"http://localhost:{local_port}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Read output line by line to find the public URL
        url_found = False
        for line in process.stdout:
            print(line, end='')
            
            # Cloudflare outputs the URL in various formats
            if "https://" in line and ".trycloudflare.com" in line:
                # Extract URL from the line
                import re
                urls = re.findall(r'https://[a-z0-9-]+\.trycloudflare\.com', line)
                if urls and not url_found:
                    url_found = True
                    print("\n" + "=" * 60)
                    print("✅ TUNNEL CREATED SUCCESSFULLY!")
                    print("=" * 60)
                    print(f"\n🌍 Public URL: {urls[0]}")
                    print(f"\n📋 Share this URL with others to access your app")
                    print(f"\n⚠️  IMPORTANT:")
                    print(f"   - Make sure your app is running (python start_app.py)")
                    print(f"   - Backend must be running on port 8000")
                    print(f"   - Frontend must be running on port 3000")
                    print(f"   - This tunnel will close when you stop this script (Ctrl+C)")
                    print("=" * 60 + "\n")
            
            # Also check for other URL formats
            if "https://" in line and not url_found:
                import re
                urls = re.findall(r'https://[^\s]+', line)
                for url in urls:
                    if "cloudflare" in url.lower() or "trycloudflare" in url.lower():
                        if not url_found:
                            url_found = True
                            print("\n" + "=" * 60)
                            print("✅ TUNNEL CREATED SUCCESSFULLY!")
                            print("=" * 60)
                            print(f"\n🌍 Public URL: {url}")
                            print(f"\n📋 Share this URL with others to access your app")
                            print("=" * 60 + "\n")
        
        process.wait()
        
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping Cloudflare tunnel...")
        process.terminate()
        print("✅ Tunnel closed")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

