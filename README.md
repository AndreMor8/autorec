# Automatic IPTV recording
Scripts to record in a massive or automatic way almost any type of IPTV.

My friends got tired of waking up every 4 or 7 AM to be able to record a program that only aired in that interval of hours. It was just stressful and left bad consequences.

So I created these scripts, so that we can continue to archive TV shows without worry.

`streamlink` is used for HLS streams, `N_m3u8DL-RE` for DRM-encrypted streams, while for the other type of stream in the IPTV world, which is endless streaming of a video file, `wget` is used.

When downloading DRM-encrypted streams, make sure you have both `N_m3u8DL-RE` and `shaka-packager` in your `$PATH` (so this script can run these directly)

The scripts are guaranteed to work on Linux.

## Alpine
```sh
apk add git npm wget streamlink ffmpeg
git clone https://github.com/AndreMor8/autorec
cd autorec
npm i
```
## Debian/Ubuntu
```sh
curl -sL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
apt install wget python3-pip git ffmpeg nodejs
pip install streamlink
git clone https://github.com/AndreMor8/autorec
cd autorec
npm i
```
