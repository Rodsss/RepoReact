// scripts/utils/domPositioning.js
// Ensure the namespace exists
window.myproject1Utils = window.myproject1Utils || {};

// Assign the function to the namespace
window.myproject1Utils.calculateOptimalMenuPosition = function (
  iconRect, // Result of iconElement.getBoundingClientRect()
  menuWidth,
  menuHeight,
  viewportWidth, // window.innerWidth
  viewportHeight, // window.innerHeight
  scrollX, // window.scrollX
  scrollY, // window.scrollY
) {
  const margin = 8; // A small margin from viewport edges & icon
  // const arrowHeight = 8; // If you plan a visual arrow on the menu, factor its size (currently unused)

  // Calculate available viewport space (document coordinates)
  const vpLeft = scrollX + margin;
  const vpTop = scrollY + margin;
  const vpRight = scrollX + viewportWidth - margin;
  const vpBottom = scrollY + viewportHeight - margin;

  let finalLeft = 0;
  let finalTop = 0;
  let chosenPlacement = null;

  // Helper function to check if a given menu rectangle (in document coordinates) fits
  function fits(left, top, width, height) {
    return (
      left >= vpLeft &&
      top >= vpTop &&
      left + width <= vpRight &&
      top + height <= vpBottom
    );
  }

  // --- Define Preferred Positions (relative to icon, in document coordinates) ---
  const positions = [
    {
      name: "right-of-icon-centered", // Preferred: To the right, vertically centered
      left: iconRect.right + scrollX + margin,
      top: iconRect.top + scrollY + iconRect.height / 2 - menuHeight / 2,
    },
    {
      name: "left-of-icon-centered", // Fallback 1: To the left, vertically centered
      left: iconRect.left + scrollX - menuWidth - margin,
      top: iconRect.top + scrollY + iconRect.height / 2 - menuHeight / 2,
    },
    {
      name: "below-icon-centered", // Fallback 2: Below, horizontally centered
      left: iconRect.left + scrollX + iconRect.width / 2 - menuWidth / 2,
      top: iconRect.bottom + scrollY + margin,
    },
    {
      name: "above-icon-centered", // Fallback 3: Above, horizontally centered
      left: iconRect.left + scrollX + iconRect.width / 2 - menuWidth / 2,
      top: iconRect.top + scrollY - menuHeight - margin,
    },
  ];

  // Try each preferred position
  for (const pos of positions) {
    if (fits(pos.left, pos.top, menuWidth, menuHeight)) {
      finalLeft = pos.left;
      finalTop = pos.top;
      chosenPlacement = pos.name;
      break; // Found a good fit
    }
  }

  // If no preferred position fits, apply a fallback
  if (!chosenPlacement) {
    chosenPlacement = "fallback-constrained";
    let fallbackLeft = iconRect.left + scrollX; // Default attempt near icon
    let fallbackTop = iconRect.top + scrollY + iconRect.height + margin; // Default below icon

    if (fallbackLeft + menuWidth > vpRight) {
      // Too far right
      fallbackLeft = vpRight - menuWidth;
    }
    if (fallbackLeft < vpLeft) {
      // Too far left
      fallbackLeft = vpLeft;
    }
    if (fallbackTop + menuHeight > vpBottom) {
      // Too far down
      fallbackTop = vpBottom - menuHeight;
      // If menu is taller than viewport (after trying to align its bottom with viewport bottom)
      if (fallbackTop < vpTop) {
        // Try placing above icon as last resort for vertical
        fallbackTop = iconRect.top + scrollY - menuHeight - margin;
        if (fallbackTop < vpTop) fallbackTop = vpTop; // Stick to viewport top if still no fit
      }
    }
    // Final check if it became too far up (e.g. small menu, placed above icon and icon is near top of screen)
    if (fallbackTop < vpTop) {
      fallbackTop = vpTop;
    }

    finalLeft = fallbackLeft;
    finalTop = fallbackTop;
  }

  // console.log(`[domPositioning.js] Menu Position: ${chosenPlacement || 'none'}`, { left: Math.round(finalLeft), top: Math.round(finalTop) });
  return {
    left: Math.round(finalLeft),
    top: Math.round(finalTop),
    placement: chosenPlacement,
  };
};
