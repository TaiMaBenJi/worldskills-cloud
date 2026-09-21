#!/system/bin/sh
cd /data/data/com.tmbj.app/files/alpine-rootfs/tmp/cloudbuild
AAPT=/data/local/tmp/aapt2/bin/aapt2
export LD_LIBRARY_PATH=/data/local/tmp/aapt2/lib
echo "STEP1 compile"
$AAPT compile --dir res -o res.zip || { echo "COMPILE_FAIL"; exit 1; }
echo "STEP2 link"
$AAPT link -o out.apk -I /system/framework/framework-res.apk --manifest AndroidManifest.xml -0 mp4 -A assets res.zip || { echo "LINK_FAIL"; exit 1; }
echo "BUILD_DONE"
ls -la out.apk
