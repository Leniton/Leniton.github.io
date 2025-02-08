import React from "react";
import Typewriter from "typewriter-effect";

function Type() {
  return (
    <Typewriter
      options={{
        strings: [
          "Unity Developer",
          "Freelancer",
          "Unity Tool Maker",
        ],
        autoStart: true,
        loop: true,
        deleteSpeed: 50,
        delay: 50
      }}
    />
  );
}

export default Type;
