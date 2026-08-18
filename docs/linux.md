# Linux Support

Elden Mod Manager runs natively on Linux. It launches Elden Ring through me3 and Steam. Proton (Steam's Windows compatibility layer) is additionally used for running Windows-only tools.

## Running Windows-Only Tools

Many mod companion [tools](tools.md), such as randomizer UIs, save editors, config utilities, and the like, only ship as Windows `.exe` files. On Linux, Elden Mod Manager handles running these via Proton automatically:

- If a tool's executable is **not** a `.exe` (a native Linux binary, AppImage, or script), it's launched directly, like any other program.
- If it **is** a `.exe`, the app launches it through Proton, specifically, the **same Proton prefix Elden Ring itself uses**. It looks up Elden Ring's Steam "compatdata" folder and whichever Proton version (including GE-Proton builds) Elden Ring is currently configured to use, then runs the tool inside that exact prefix. From the tool's perspective, it's running in the same Windows-like environment as the game, sharing the same registry and filesystem state.

You don't need to configure anything for this to work, as long as:

- Elden Ring has been launched at least once through Steam (so its Proton prefix actually exists on disk)
- The Proton build Elden Ring uses is installed through Steam — either a standard Proton version, or a GE-Proton build in Steam's `compatibilitytools.d` folder (a Proton build installed some other way won't be found)
- Any prerequisites the tool itself needs are installed in that Proton prefix (e.g. .NET, Visual C++ redistributables, etc.). I recommend using [Protontricks](https://protontricks.com/) for this.

## The Proton Launch Verb

Separately, launching the *game itself* modded (via me3) also goes through Proton, using a Proton **launch verb** — the specific sub-command Proton uses to start the game, the same mechanism Steam uses under the hood. By default this uses the verb Steam itself normally uses, `waitforexitandrun`, which waits for the game process to fully exit before handing control back.

The **Override Proton Verb** toggle (in [Profiles → Profile-Specific Settings](profiles.md#profile-specific-settings), Linux only) switches to the `run` verb instead. Turn this on if you need to run something else alongside the game, such as a mod's tool, since the default wait-based verb will prevent the game from launching if something else is running in the prefix. Leave it off unless you have a specific reason to change it.
