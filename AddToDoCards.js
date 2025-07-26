// Fetch TODOs from text.json and render Bootstrap cards
fetch("text.json")
  .then((response) => response.json())
  .then((data) => {
    const todos = data.TODO || [];
    const container = document.getElementById("todo-cards");
    todos.forEach((item) => {
      const isCareer = item.type === "Career";
      const bgColor = isCareer ? "#CBC3E3" : "#ADD8E6";
      const card = document.createElement("div");
      card.className = "col-12";
      card.innerHTML = `
        <div class="card h-100" style="background:${bgColor}; border:none;">
          <div class="card-body d-flex flex-column justify-content-between">
            <h4 class="card-title mb-2" style="font-size:1.5rem; font-weight:bold;">${item.title}</h4>
            <p class="card-text text-muted mb-0" style="font-size:1rem;">${item.date}</p>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  })
  .catch((err) => {
    document.getElementById("todo-cards").innerHTML =
      '<div class="alert alert-danger">Failed to load TODOs.</div>';
  });
