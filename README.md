# Elden Mod Manager

## Description

Elden Mod Manager is a GUI for ModEngine2, which aims to simplify the process of installing, enabling, and configuring mods for Elden Ring.

## Features

- Installing mods to a managed folder separate from your Elden Ring install directory
- Easy configuration of load order and disabled mods
- Built-in launching of the game both modded and unmodded with a single click
- Support for Standard and DLL mods

## Installation

To install, either use the installer from the release or extract the Zip release to a directory of your choosing. Upon the first launch, you will be prompted to select your install locations for ModEngine2. When you first go to the Mods tab, you will be prompted to select an install location for your Mods. I recommend using the defaults for both but feel free to change them.

## Usage

To add a mod, navigate to the Mods tab and select Add Mod from Zip if the mod is in a compressed Zip file, otherwise, select Add Mod from Folder. From there, fill out the form. Here's some more info on some of the fields.

- Path: The path you downloaded your mod to.
- Is DLL Mod?: Whether or not the mod you are installing is a .dll file. Some examples include stutter fix, pause the game, and seamless co-op
- Has application?: Whether or not your mod has an associated executable with it, such as the Item and Enemy randomizer
- Delete after import?: Check this box if you want to delete the mod's original download after it is imported

## Special Thanks

Special thanks to soulsmods and its contributors for creating ModEngine2. Without their work, this project would do nothing.

- https://github.com/soulsmods/ModEngine2

## Bug Reports

To report a bug or issue, go to Help > Bug Report, or https://github.com/Mkeefeus/Elden-Mod-Manager/issues to open an issue on GitHub.

## FAQ

How do I install Seamless Co-Op?

- Seamless co-op also requires you to configure some settings. Once you have imported the mod, select "Mods folder" from the Go menu, then find your seamless co-op folder, and open the ini file (as of v1.7.8 this is called ersc_settings.ini). You may also need to copy the crashpad and locale folders to your game directory. Copy those folders from the same location as the ini file. From there, select "Elden Ring folder" from the Go menu, and create a folder titled "SeemlessCoop" if it is not already created. Paste the Locales and Crashpad folders into the SeemelessCoop folder.

"Could not find signature" Error

- Some of Techiew's mods have a compatibility issue with ME2 where they try to load a little too quickly, causing this error. Nordgaren and Gixxpunk created a fix for these mods, which I have repackaged for easy import here https://github.com/Mkeefeus/EldenRingMods/releases. Download the zip file for the mod you want to install and use Add Mod from Zip to import.

What if I don't have the game on Steam?

- The Steam version of the game is the only one that I support. It may work, it may not. Do not open issues or bug reports on GitHub if you are not running the game on Steam.
