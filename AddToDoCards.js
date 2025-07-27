// Render Bootstrap cards as before
fetch("text.json")
  .then((response) => response.json())
  .then((data) => {
    const todos = data.TODO || [];
    const container = document.getElementById("todo-cards");
    container.className = "row row-cols-1 g-4";
    container.style.position = "";
    // Render cards
    todos.forEach((item) => {
      const isCareer = item.type === "Career";
      const bgColor = isCareer ? "#CBC3E3" : "#ADD8E6";
      const cardCol = document.createElement("div");
      cardCol.className = "col-12";
      cardCol.innerHTML = `
        <div class=\"card h-100\" style=\"background:${bgColor}; border:none;\">
          <div class=\"card-body d-flex flex-column justify-content-between\">
            <h4 class=\"card-title mb-2\" style=\"font-size:1.5rem; font-weight:bold;\">${item.title}</h4>
            <p class=\"card-text text-muted mb-0\" style=\"font-size:1rem;\">${item.date}</p>
          </div>
        </div>
      `;
      container.appendChild(cardCol);
    });

    // Matter.js mouse constraint and gravity only after drag
    const Engine = window.Matter.Engine;
    const Render = window.Matter.Render;
    const Runner = window.Matter.Runner;
    const Bodies = window.Matter.Bodies;
    const Composite = window.Matter.Composite;
    const Mouse = window.Matter.Mouse;
    const MouseConstraint = window.Matter.MouseConstraint;
    const Events = window.Matter.Events;

    const engine = Engine.create();
    engine.gravity.y = 0; // No gravity initially
    const runner = Runner.create();
    Runner.run(runner, engine);

    // Set up physics for each card
    const cardDivs = Array.from(container.querySelectorAll(".card"));
    const cardBodies = [];
    const cardWidth = 400;
    const cardHeight = 120;
    const margin = 24;
    cardDivs.forEach((div, i) => {
      div.style.position = "absolute";
      div.style.width = cardWidth + "px";
      div.style.height = cardHeight + "px";
      div.parentElement.style.position = "absolute";
      div.parentElement.style.left =
        window.innerWidth / 2 - cardWidth / 2 + "px";
      div.parentElement.style.top = margin + i * (cardHeight + margin) + "px";
      div.parentElement.style.width = cardWidth + "px";
      div.parentElement.style.height = cardHeight + "px";
      // Create physics body (dynamic, but gravity scale 0)
      const body = Bodies.rectangle(
        window.innerWidth / 2,
        margin + i * (cardHeight + margin) + cardHeight / 2,
        cardWidth,
        cardHeight,
        {
          restitution: 0.7,
          friction: 0.2,
          isStatic: false,
          plugin: { gravityScale: 0 },
        }
      );
      cardBodies.push(body);
      Composite.add(engine.world, body);
    });

    // Add only ground (no left/right walls)
    const ground = Bodies.rectangle(
      cardWidth / 2 + 32,
      window.innerHeight + 60,
      cardWidth * 2,
      40,
      { isStatic: true }
    );
    Composite.add(engine.world, [ground]);

    // Mouse control
    const mouse = Mouse.create(document.body);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    Composite.add(engine.world, mouseConstraint);

    // Only enable gravity for a card after drag
    Events.on(mouseConstraint, "enddrag", function (event) {
      const body = event.body;
      if (body) {
        // Set a custom property to enable gravity for this card
        body.plugin.gravityScale = 1;
      }
    });

    // Custom gravity per card
    Events.on(engine, "beforeUpdate", function () {
      for (let i = 0; i < cardBodies.length; i++) {
        const body = cardBodies[i];
        // Only apply gravity if gravityScale is 1
        if (body.plugin.gravityScale === 1) {
          body.force.y += body.mass * engine.gravity.y * 0.001; // scale gravity for smoothness
        }
      }
    });

    // Sync DOM to physics and remove cards that leave the page
    function update() {
      for (let i = cardBodies.length - 1; i >= 0; i--) {
        const body = cardBodies[i];
        const div = cardDivs[i].parentElement;
        // Remove if the entire card is out of viewport (all sides)
        if (
          body.position.x + cardWidth / 2 < 0 ||
          body.position.x - cardWidth / 2 > window.innerWidth ||
          body.position.y - cardHeight / 2 > window.innerHeight ||
          body.position.y + cardHeight / 2 < 0
        ) {
          if (div && div.parentElement) div.parentElement.removeChild(div);
          Composite.remove(engine.world, body);
          cardBodies.splice(i, 1);
          cardDivs.splice(i, 1);
          continue;
        }
        div.style.left = body.position.x - cardWidth / 2 + "px";
        div.style.top = body.position.y - cardHeight / 2 + "px";
        div.style.transform = `rotate(${body.angle}rad)`;
      }
      requestAnimationFrame(update);
    }
    update();

    // Prevent text selection while dragging
    Events.on(mouseConstraint, "startdrag", function () {
      document.body.style.userSelect = "none";
    });
    Events.on(mouseConstraint, "enddrag", function () {
      document.body.style.userSelect = "";
    });
  })
  .catch((err) => {
    document.getElementById("todo-cards").innerHTML =
      '<div class="alert alert-danger">Failed to load TODOs.</div>';
  });
