#!/bin/bash

# Script to regenerate Android resources for the Darshanam Compass app

echo "Generating Android resources..."

# Create directories
mkdir -p android/app/src/main/res/values
mkdir -p android/app/src/main/res/drawable
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi

# Create strings.xml
cat > android/app/src/main/res/values/strings.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Darshanam Compass</string>
</resources>
EOF

# Create styles.xml
cat > android/app/src/main/res/values/styles.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <!-- Customize your theme here. -->
        <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>
    </style>
</resources>
EOF

# Create drawable resource
cat > android/app/src/main/res/drawable/rn_edit_text_material.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
       android:insetLeft="@dimen/abc_edit_text_inset_horizontal_material"
       android:insetRight="@dimen/abc_edit_text_inset_horizontal_material"
       android:insetTop="@dimen/abc_edit_text_inset_top_material"
       android:insetBottom="@dimen/abc_edit_text_inset_bottom_material">

    <selector>
        <item android:state_enabled="false">
            <nine-patch android:src="@drawable/abc_textfield_default_mtrl_alpha"/>
        </item>
        <item>
            <nine-patch android:src="@drawable/abc_textfield_activated_mtrl_alpha"/>
        </item>
    </selector>

</inset>
EOF

# Generate app icons from compass-icon.png
if [ -f "assets/images/compass-icon.png" ]; then
    echo "Generating app icons..."
    
    # Check if sips is available (macOS)
    if command -v sips &> /dev/null; then
        sips -z 48 48 assets/images/compass-icon.png --out android/app/src/main/res/mipmap-mdpi/ic_launcher.png
        sips -z 48 48 assets/images/compass-icon.png --out android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
        sips -z 72 72 assets/images/compass-icon.png --out android/app/src/main/res/mipmap-hdpi/ic_launcher.png
        sips -z 72 72 assets/images/compass-icon.png --out android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
        sips -z 96 96 assets/images/compass-icon.png --out android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
        sips -z 96 96 assets/images/compass-icon.png --out android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
        sips -z 144 144 assets/images/compass-icon.png --out android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
        sips -z 144 144 assets/images/compass-icon.png --out android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
        sips -z 192 192 assets/images/compass-icon.png --out android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
        sips -z 192 192 assets/images/compass-icon.png --out android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
        echo "App icons generated successfully!"
    else
        echo "Warning: sips not found. Please install ImageMagick or use macOS sips to generate icons."
        echo "You can manually resize assets/images/compass-icon.png to the following sizes:"
        echo "  mdpi: 48x48"
        echo "  hdpi: 72x72"
        echo "  xhdpi: 96x96"
        echo "  xxhdpi: 144x144"
        echo "  xxxhdpi: 192x192"
    fi
else
    echo "Warning: assets/images/compass-icon.png not found. Please provide a compass icon."
fi

echo "Android resources generated successfully!"
echo "Note: These files are now in .gitignore to avoid large commits."
echo "Run this script after cloning the repository to regenerate resources." 