(() => {
    const defaultColors = {
        base: "#0086B6",
        sandBack: "#dcae20",
        sandMiddle: "#edc833",
        sandFront: "#ffeb70",
        backgroundTint: null
    };

    const aquariumColors = {
        1: { ...defaultColors },
        2: {
            ...defaultColors,
            base: "#000",
            sandBack: "#71834a",
            sandMiddle: "#8fa85a",
            sandFront: "#b7c87a"
        },
        3: {
            ...defaultColors,
            base: "#7d1313",
            sandBack: "#762323",
            sandMiddle: "#a83b3b",
            sandFront: "#d86666"
        },
        4: { ...defaultColors,
            base: "#000",
            sandBack: "#71834a",
            sandMiddle: "#8fa85a",
            sandFront: "#b7c87a" },
        5: { ...defaultColors,
            base: "#343038dd",
            sandBack: "#28280a",
            sandMiddle: "#4b4b12",
            sandFront: "#7e7414"
        }
    };

    function getAquariumColors(aquariumNumber) {
        if (aquariumNumber <= 5) {
            return aquariumColors[aquariumNumber] || defaultColors;
        }

        const seed = Math.imul(aquariumNumber, 2654435761) >>> 0;
        const hue = (aquariumNumber * 137.50776405003785) % 360;
        const saturation = 58 + (seed % 23);
        const lightness = 38 + ((seed >>> 8) % 20);
        const base = `hsl(${hue} ${saturation}% ${lightness}%)`;

        return {
            base,
            sandBack: `hsl(${hue} 42% 34%)`,
            sandMiddle: `hsl(${hue} 48% 48%)`,
            sandFront: `hsl(${hue} 54% 64%)`,
            backgroundTint: base
        };
    }

    function applyAquariumColors(body, scene, aquariumNumber) {
        const colors = getAquariumColors(aquariumNumber);
        body.style.setProperty("--aquarium-base-color", colors.base);
        body.style.setProperty("--aquarium-sand-back", colors.sandBack);
        body.style.setProperty("--aquarium-sand-middle", colors.sandMiddle);
        body.style.setProperty("--aquarium-sand-front", colors.sandFront);

        if (colors.backgroundTint) {
            scene.style.setProperty("--aquarium-background-tint-color", colors.backgroundTint);
        } else {
            scene.style.removeProperty("--aquarium-background-tint-color");
        }
    }

    window.aquariumColors = {
        get: getAquariumColors,
        apply: applyAquariumColors
    };
})();
