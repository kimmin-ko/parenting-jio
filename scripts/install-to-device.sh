#!/bin/bash
# 지오 분유 앱 - 연결된 iPhone에 자동 빌드 & 설치
# 사용법: ./scripts/install-to-device.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"
WORKSPACE="$IOS_DIR/parentingjio.xcworkspace"
SCHEME="parentingjio"
DERIVED_DATA="$PROJECT_DIR/.xcode-build"

# 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🍼 지오 분유 - iPhone 설치 스크립트${NC}"
echo ""

# 1. 연결된 디바이스 확인
DEVICE_ID=$(xcrun xctrace list devices 2>&1 | grep -v "Simulator" | grep "iPhone" | head -1 | grep -oE '[A-F0-9-]{25,}')

if [ -z "$DEVICE_ID" ]; then
  echo -e "${RED}iPhone이 연결되지 않았습니다. USB로 연결해주세요.${NC}"
  exit 1
fi

DEVICE_NAME=$(xcrun xctrace list devices 2>&1 | grep -v "Simulator" | grep "$DEVICE_ID" | sed "s/ ($DEVICE_ID)//" | xargs)
echo -e "${GREEN}디바이스 발견: ${DEVICE_NAME}${NC}"
echo ""

# 2. ios 디렉토리 확인
if [ ! -d "$IOS_DIR" ]; then
  echo -e "${YELLOW}ios/ 디렉토리가 없습니다. prebuild 실행 중...${NC}"
  cd "$PROJECT_DIR" && npx expo prebuild --platform ios --clean
fi

# 3. Pod install
if [ ! -d "$IOS_DIR/Pods" ]; then
  echo -e "${YELLOW}Pods 설치 중...${NC}"
  cd "$IOS_DIR" && pod install
fi

# 4. 빌드 & 설치
echo -e "${GREEN}빌드 시작...${NC}"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -destination "id=$DEVICE_ID" \
  -derivedDataPath "$DERIVED_DATA" \
  -allowProvisioningUpdates \
  build 2>&1 | tail -5

# 5. 앱 찾기 & 설치
APP_PATH=$(find "$DERIVED_DATA" -name "*.app" -path "*/Debug-iphoneos/*" | head -1)

if [ -z "$APP_PATH" ]; then
  echo -e "${RED}빌드된 앱을 찾을 수 없습니다.${NC}"
  exit 1
fi

echo -e "${GREEN}앱 설치 중...${NC}"
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH" 2>&1

echo ""
echo -e "${GREEN}✅ 설치 완료! ${DEVICE_NAME}에서 앱을 확인하세요.${NC}"
echo -e "${YELLOW}💡 7일 후 만료되면 다시 이 스크립트를 실행하세요.${NC}"
