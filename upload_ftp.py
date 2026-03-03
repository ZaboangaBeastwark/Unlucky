import ftplib
import os

FTP_HOST = "ftp.web15f84.uni5.net"
FTP_USER = "rpgbearhouse"
FTP_PASS = "368561@rpG"

files_to_upload = [
    "index.html",
    "js/gm.js",
    "js/player.js",
    "api/gm.php",
    "api/character.php"
]

local_dir = r"c:\Users\hofma\OneDrive\Área de Trabalho\Apps\Protótipo DaggerHeart"
remote_dir = "www" # Standard for uni5 / kinghost is often 'www' or root. We can try root first or 'www'.

def uploadFiles():
    try:
        print(f"Connecting to {FTP_HOST}...")
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        print("Connected.")
        
        # Check current dir
        print("Current directory:", ftp.pwd())
        
        # Let's see if we see 'www' or index.html directly
        items = ftp.nlst()
        target_root = ""
        if "www" in items:
            target_root = "www/"
            print("Found 'www' folder, using it as web root.")
        elif "public_html" in items:
            target_root = "public_html/"
            print("Found 'public_html' folder, using it as web root.")
        else:
            print("Using FTP root as web root.")
            
        for file in files_to_upload:
            local_path = os.path.join(local_dir, file)
            remote_path = target_root + file.replace("\\", "/")
            
            # Make sure remote dir exists for subfolders (like js/, api/)
            if "/" in file:
                remote_subdir = target_root + file.split("/")[0]
                try:
                    ftp.cwd(remote_subdir)
                    ftp.cwd("..")
                    if target_root: 
                        ftp.cwd(target_root.rstrip('/'))
                        ftp.cwd("..")
                except:
                    print(f"Creating directory {remote_subdir}")
                    try:
                        ftp.mkd(remote_subdir)
                    except Exception as e:
                        print("Mkdir error:", e)

            print(f"Uploading {file} to {remote_path}...")
            with open(local_path, "rb") as f:
                ftp.storbinary(f"STOR {remote_path}", f)
            print("Success.")

        ftp.quit()
        print("All files uploaded successfully.")
        
    except Exception as e:
        print("Failed:", e)

if __name__ == "__main__":
    uploadFiles()
