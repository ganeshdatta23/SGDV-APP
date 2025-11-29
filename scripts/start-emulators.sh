#!/bin/bash

# 🙏 SGDV App - Android Emulator Helper Script
# This script helps you start multiple Android emulators for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║   🙏 SGDV App - Android Emulator Manager 🙏      ║"
echo "║         Om Dram Dattaya Namaha                    ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if emulator command exists
if ! command -v emulator &> /dev/null; then
    echo -e "${RED}❌ Error: 'emulator' command not found${NC}"
    echo -e "${YELLOW}💡 Make sure ANDROID_HOME is set and emulator is in PATH${NC}"
    echo ""
    echo "Add to ~/.zshrc:"
    echo "  export ANDROID_HOME=\$HOME/Library/Android/sdk"
    echo "  export PATH=\$PATH:\$ANDROID_HOME/emulator"
    exit 1
fi

# Check if adb command exists
if ! command -v adb &> /dev/null; then
    echo -e "${RED}❌ Error: 'adb' command not found${NC}"
    echo -e "${YELLOW}💡 Make sure ANDROID_HOME is set and platform-tools is in PATH${NC}"
    exit 1
fi

# Function to list available AVDs
list_avds() {
    echo -e "${BLUE}📱 Available Android Virtual Devices:${NC}"
    echo ""
    emulator -list-avds | nl
    echo ""
}

# Function to check running emulators
check_running() {
    echo -e "${BLUE}🔍 Currently running emulators:${NC}"
    echo ""
    adb devices
    echo ""
}

# Function to start a single emulator
start_single() {
    local avd_name=$1
    echo -e "${GREEN}🚀 Starting emulator: ${avd_name}${NC}"
    emulator -avd "${avd_name}" &
    echo -e "${YELLOW}⏳ Waiting 30 seconds for emulator to boot...${NC}"
    sleep 30
    echo -e "${GREEN}✅ Emulator started!${NC}"
}

# Function to start multiple emulators
start_multiple() {
    echo -e "${YELLOW}🎯 Multi-device testing mode${NC}"
    echo ""
    
    local avds=("$@")
    local wait_time=15
    
    for i in "${!avds[@]}"; do
        local avd="${avds[$i]}"
        echo -e "${GREEN}🚀 Starting emulator $((i+1))/${#avds[@]}: ${avd}${NC}"
        emulator -avd "${avd}" &
        
        # Don't wait after the last one
        if [ $i -lt $((${#avds[@]} - 1)) ]; then
            echo -e "${YELLOW}⏳ Waiting ${wait_time}s before starting next...${NC}"
            sleep ${wait_time}
        fi
    done
    
    echo ""
    echo -e "${GREEN}✅ All emulators started!${NC}"
    echo -e "${YELLOW}⏳ Waiting 30 seconds for final boot...${NC}"
    sleep 30
}

# Function to kill all emulators
kill_all() {
    echo -e "${YELLOW}🛑 Killing all running emulators...${NC}"
    adb devices | grep emulator | cut -f1 | xargs -I {} adb -s {} emu kill || true
    echo -e "${GREEN}✅ All emulators killed${NC}"
}

# Function to start Expo
start_expo() {
    echo -e "${BLUE}🎭 Starting Expo development server...${NC}"
    echo ""
    echo -e "${GREEN}Once Expo starts, press 'a' to install on all Android devices${NC}"
    echo ""
    npx expo start
}

# Main menu
show_menu() {
    echo -e "${BLUE}What would you like to do?${NC}"
    echo ""
    echo "1) List available AVDs"
    echo "2) Check running emulators"
    echo "3) Start a single emulator"
    echo "4) Start multiple emulators (testing mode)"
    echo "5) Kill all running emulators"
    echo "6) Start Expo (and keep this script running)"
    echo "7) Quick start (1 emulator + Expo)"
    echo "0) Exit"
    echo ""
    read -p "Enter choice [0-7]: " choice
    
    case $choice in
        1)
            list_avds
            show_menu
            ;;
        2)
            check_running
            show_menu
            ;;
        3)
            list_avds
            read -p "Enter AVD name: " avd_name
            start_single "${avd_name}"
            show_menu
            ;;
        4)
            list_avds
            echo -e "${YELLOW}Enter AVD names separated by spaces:${NC}"
            read -p "> " avd_names
            start_multiple ${avd_names}
            check_running
            echo ""
            echo -e "${GREEN}🎉 Ready for testing!${NC}"
            echo -e "${BLUE}📝 Next: Run 'npx expo start' and press 'a'${NC}"
            show_menu
            ;;
        5)
            kill_all
            show_menu
            ;;
        6)
            start_expo
            ;;
        7)
            list_avds
            read -p "Enter AVD name (or press Enter for first available): " avd_name
            
            if [ -z "$avd_name" ]; then
                # Get first AVD
                avd_name=$(emulator -list-avds | head -1)
                echo -e "${YELLOW}Using: ${avd_name}${NC}"
            fi
            
            start_single "${avd_name}"
            check_running
            echo ""
            echo -e "${GREEN}🎉 Emulator ready!${NC}"
            echo -e "${BLUE}🎭 Starting Expo...${NC}"
            echo ""
            start_expo
            ;;
        0)
            echo -e "${GREEN}🙏 Om Dram Dattaya Namaha 🙏${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            show_menu
            ;;
    esac
}

# If arguments provided, use them
if [ $# -gt 0 ]; then
    case "$1" in
        list|ls)
            list_avds
            ;;
        status|ps)
            check_running
            ;;
        start)
            shift
            if [ $# -eq 1 ]; then
                start_single "$1"
            else
                start_multiple "$@"
            fi
            ;;
        kill|stop)
            kill_all
            ;;
        expo)
            start_expo
            ;;
        quick)
            avd_name="${2:-$(emulator -list-avds | head -1)}"
            start_single "${avd_name}"
            check_running
            echo ""
            echo -e "${GREEN}🎉 Starting Expo...${NC}"
            start_expo
            ;;
        help|--help|-h)
            echo "Usage: $0 [command] [args...]"
            echo ""
            echo "Commands:"
            echo "  list              List available AVDs"
            echo "  status            Check running emulators"
            echo "  start <avd>       Start a single emulator"
            echo "  start <avd1> ...  Start multiple emulators"
            echo "  kill              Kill all running emulators"
            echo "  expo              Start Expo development server"
            echo "  quick [avd]       Start emulator + Expo (default: first AVD)"
            echo ""
            echo "Examples:"
            echo "  $0 list"
            echo "  $0 start Pixel_8_API_34"
            echo "  $0 start Pixel_4a_API_34 Pixel_8_API_34 Pixel_Tablet"
            echo "  $0 quick"
            echo "  $0 quick Pixel_8_Pro_API_34"
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            echo "Run '$0 help' for usage"
            exit 1
            ;;
    esac
else
    # Interactive mode
    show_menu
fi

