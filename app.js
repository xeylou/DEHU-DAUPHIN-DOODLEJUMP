/********************************************************
 *                      MODEL
 ********************************************************/
/**
 * @class Model
 * @description Modèle de MVC
 */
class Model {
  // Paramètres de la physique de Doodle
  static GRAVITY = 20;
  static JUMP_FORCE = 900;
  static SPEED = 400;

  static CANVAS_WIDTH = 600;
  static CANVAS_HEIGHT = 800;

  // Difficulté initiale
  static MIN_GAP_START = 80;
  static MAX_GAP_START = 120;
  static MIN_PLATFORMS_START = 7;
  static MAX_FEASIBLE_GAP = 325; // hauteur de saut max possible (gap, ajusté à la main)

  /**
   * @constructor
   * @description Initialise la position de Doodle, la difficulté, les plateformes
   *              + charge le scoreboard depuis localStorage
   */
  constructor() {
    // Doodle
    this._direction = 0;
    this._gravitySpeed = 0;
    this._position = { x: 300, y: 700 };
    this._scrolledDistance = 0;
    this._facing = 1;

    // Difficulté
    this._minGapCurrent = Model.MIN_GAP_START;
    this._maxGapCurrent = Model.MAX_GAP_START;
    this._minPlatformsCurrent = Model.MIN_PLATFORMS_START;

    // Plateformes
    this._platforms = this._createPlatforms();
    this._finishLineY = -14650; // position de la ligne d'arrivée

    // Scoreboard
    this._scoreboard = []; 
    this._loadScoreboardFromStorage();
  }

  /* ======================
   *   Getters et setters
   * ====================== */
  get direction() { return this._direction; }
  set direction(value) {
    this._direction = value;
    if (value !== 0) {
      this._facing = (value > 0) ? 1 : -1;
    }
  }
  get facing() { return this._facing; }
  get position() { return this._position; }
  get scrolledDistance() { return this._scrolledDistance; }

  /**
   * @description Relie la fonction d'affichage (Controller -> View) au modèle.
   * @param {Function} callback - Méthode Display du Controller.
   */
  BindDisplay(callback) {
    this.b_Display = callback;
  }

  /* ======================
   *   SCOREBOARD
   * ====================== */
  /**
   * @private
   * @description Charge le scoreboard depuis localStorage (clef : 'doodle_tableau_des_scores').
   */
  _loadScoreboardFromStorage() {
    const stored = localStorage.getItem('doodle_tableau_des_scores');
    if (stored) {
      try {
        this._scoreboard = JSON.parse(stored);
      } catch (e) {
        this._scoreboard = [];
      }
    }
  }

  /**
   * @private
   * @description Sauvegarde le scoreboard dans localStorage.
   */
  _saveScoreboardToStorage() {
    localStorage.setItem('doodle_tableau_des_scores', JSON.stringify(this._scoreboard));
  }

  /**
   * @description Ajoute un score (pseudo + valeur), puis tri par ordre décroissant.
   * @param {string} pseudo - Nom du joueur
   * @param {number} score - Valeur du score
   */
  addScore(pseudo, score) {
    this._scoreboard.push({ pseudo, score });
    // Tri desc
    this._scoreboard.sort((a, b) => b.score - a.score);
    this._saveScoreboardToStorage();
  }

  /**
   * @description Retourne le tableau des scores en mémoire (pour affichage).
   * @returns {Array} Liste de { pseudo, score }
   */
  getScoreboard() {
    return this._scoreboard;
  }

  /* ======================
   *   GAME LOGIC
   * ====================== */

  /**
   * @description Gère la physique du doodle (gravité, collisions, scroll).
   * @param {number} fps - Taux de rafraîchissement (ex: 60).
   */
  Move(fps) {
    this._updateDifficulty();

    // Gravité
    this._gravitySpeed += Model.GRAVITY;
    this._position.y += this._gravitySpeed / fps;

    // Déplacement horizontal
    const vx = this._direction * Model.SPEED / fps;
    this._position.x += vx;

    // Petit gauche droite chaussé décalé dans le G/D
    if (this._position.x < -30) {
      this._position.x = Model.CANVAS_WIDTH + 30;
    } else if (this._position.x > Model.CANVAS_WIDTH + 30) {
      this._position.x = -30;
    }

    // Victoire (distance >= 15000)
    if (this._scrolledDistance >= 15000) {
      this.b_Display('Gagne');
      return;
    }

    // Game Over (tombe en bas)
    if (this._position.y > Model.CANVAS_HEIGHT) {
      this.b_Display('Game Over');
      return;
    }

    // Scroll quand le doodle dépasse la moitié
    if (this._position.y < Model.CANVAS_HEIGHT / 2) {
      let deltaY = Model.CANVAS_HEIGHT / 2 - this._position.y;
      this._position.y = Model.CANVAS_HEIGHT / 2;
      for (let p of this._platforms) {
        p.y += deltaY;
      }
      this._finishLineY += deltaY;
      this._scrolledDistance += deltaY;
    }

    // Collision avec plateformes => rebond
    for (let i = this._platforms.length - 1; i >= 0; i--) {
      let p = this._platforms[i];
      if (
        this._position.x >= p.x - 30 &&
        this._position.x <= p.x + p.width &&
        this._position.y >= p.y - 2 &&
        this._position.y <= p.y + p.height &&
        this._gravitySpeed > 0
      ) {
        // Saut
        this._gravitySpeed = -Model.JUMP_FORCE;
        // Plateforme blanche => disparaît
        if (p.color === 'white') {
          this._platforms.splice(i, 1);
        }
      }
    }

    // Mise à jour des plateformes
    this._updatePlatforms();

    // Appel de l'affichage
    this.b_Display(this._position, this._direction, this._platforms, this._finishLineY);
  }

  /**
   * @private
   * @description Met à jour la difficulté en fonction de la distance.
   */
  _updateDifficulty() {
    let ratio = this._scrolledDistance / 15000;
    if (ratio > 1) ratio = 1;

    // minGap : 80 => 180
    let newMinGap = Model.MIN_GAP_START + (100 * ratio);
    // maxGap : 120 => 325
    let newMaxGap = Model.MAX_GAP_START + (Model.MAX_FEASIBLE_GAP - Model.MAX_GAP_START) * ratio;
    if (newMinGap > newMaxGap - 20) {
      newMinGap = newMaxGap - 20;
    }
    this._minGapCurrent = newMinGap;
    this._maxGapCurrent = newMaxGap;

    // Nombre minimal de plateformes : 7 => 4
    let deltaPlat = Model.MIN_PLATFORMS_START - 4; 
    let dynamicPlat = Model.MIN_PLATFORMS_START - Math.floor(deltaPlat * ratio);
    this._minPlatformsCurrent = dynamicPlat;
  }

  /**
   * @private
   * @description Création initiale des plateformes.
   */
  _createPlatforms() {
    const plats = [];
    let lastY = Model.CANVAS_HEIGHT + 200;

    while (lastY > -2000) {
      const gap = this._minGapCurrent + Math.random() * (this._maxGapCurrent - this._minGapCurrent);
      lastY -= gap;

      const pWidth = 100;
      const pHeight = 20;
      const x = this._generateNonOverlappingX(lastY, plats, pWidth);
      const color = (plats.length === 0) ? 'green' : this._getPlatformColor();

      plats.push({
        x,
        y: lastY,
        width: pWidth,
        height: pHeight,
        color,
        isMoving: (color === 'blue'),
        speed: (color === 'blue') ? 1 + Math.random() : 0,
        direction: 1,
      });
    }

    // Plateforme fixe (juste sous le doodle)
    plats.push({
      x: this._position.x - 50,
      y: this._position.y + 40,
      width: 100,
      height: 20,
      color: 'green',
      isMoving: false,
      speed: 0,
      direction: 0,
    });

    return plats;
  }

  /**
   * @private
   * @description Évite que la nouvelle plateforme chevauche celles déjà présentes.
   */
  _generateNonOverlappingX(newY, platforms, pWidth) {
    const doodleSize = 80;
    let attempts = 0;
    let x;
    while (attempts < 20) {
      x = Math.random() * (Model.CANVAS_WIDTH - pWidth);
      let valid = true;
      for (const plat of platforms) {
        if (Math.abs(plat.y - newY) < doodleSize) {
          if (Math.abs(plat.x - x) < doodleSize) {
            valid = false;
            break;
          }
        }
      }
      if (valid) return x;
      attempts++;
    }
    return x;
  }

  /**
   * @private
   * @description Détermine la couleur de la plateforme (green/blue/white).
   */
  _getPlatformColor() {
    let dist = this._scrolledDistance;
    let greenRate = 0.5, blueRate = 0.3, whiteRate = 0.2;

    if (dist >= 7500) {
      // Palier difficile
      greenRate = 0;
      blueRate = 0.5;
      whiteRate = 0.5;
    } else if (dist >= 2500) {
      // Palier intermédiaire
      greenRate = 0.25;
      blueRate = 0.4;
      whiteRate = 0.35;
    }
    // Sinon (dist<2500) => palier facile

    let r = Math.random();
    if (r < blueRate) return 'blue';
    else if (r < blueRate + whiteRate) return 'white';
    else return 'green';
  }

  /**
   * @private
   * @description Met à jour les plateformes (mouvantes, remplacement quand elles sortent, etc.).
   */
  _updatePlatforms() {
    for (let i = 0; i < this._platforms.length; i++) {
      let p = this._platforms[i];
      // Mouvement latéral si bleue
      if (p.isMoving) {
        p.x += p.speed * p.direction;
        if (p.x < 0) {
          p.x = 0;
          p.direction *= -1;
        } else if (p.x + p.width > Model.CANVAS_WIDTH) {
          p.x = Model.CANVAS_WIDTH - p.width;
          p.direction *= -1;
        }
      }

      // Sort en bas => replacer en haut
      if (p.y > Model.CANVAS_HEIGHT) {
        let other = this._platforms.filter(q => q !== p);
        let minY = Math.min(...other.map(q => q.y));
        let gap = this._minGapCurrent + Math.random() * (this._maxGapCurrent - this._minGapCurrent);
        let newY = minY - gap;
        p.y = newY;
        p.x = this._generateNonOverlappingX(newY, other, p.width);

        let newColor = this._getPlatformColor();
        p.color = newColor;
        p.isMoving = (newColor === 'blue');
        p.speed = p.isMoving ? 1 + Math.random() : 0;
        p.direction = 1;
      }
    }

    // Vérifie le nombre minimal de plateformes
    while (this._platforms.length < this._minPlatformsCurrent) {
      let pWidth = 100, pHeight = 20;
      let gap = this._minGapCurrent + Math.random() * (this._maxGapCurrent - this._minGapCurrent);
      let minY = Math.min(...this._platforms.map(q => q.y));
      let newY = minY - gap;
      let x = this._generateNonOverlappingX(newY, this._platforms, pWidth);
      let color = this._getPlatformColor();
      this._platforms.push({
        x,
        y: newY,
        width: pWidth,
        height: pHeight,
        color,
        isMoving: (color === 'blue'),
        speed: (color === 'blue') ? 1 + Math.random() : 0,
        direction: 1,
      });
    }
  }
}

/********************************************************
 *                      VIEW
 ********************************************************/
/**
 * @class View
 * @description Gère l'affichage (canvas) + l'UI (pseudo, tableau scores, etc.)
 */
class View {
  constructor() {
    this._canvas = document.getElementById('my_canvas');
    this.ctx = this._canvas.getContext('2d');

    // Images
    this.platformBlue = new Image();
    this.platformBlue.src = 'Platbleu.png';
    this.platformGreen = new Image();
    this.platformGreen.src = 'Platverte.png';
    this.platformWhite = new Image();
    this.platformWhite.src = 'Platblanche.png';
    this.doodleRight = new Image();
    this.doodleRight.src = 'doodler.png';
    this.doodleLeft = new Image();
    this.doodleLeft.src = 'doodlel.png';
    this.finishLine = new Image();
    this.finishLine.src = 'finish_line.png';

    // Éléments UI
    this.retryButton = document.getElementById('retry-button');
    this.tableauScoresDiv = document.getElementById('tableau-scores');
    this.listeScores = document.getElementById('liste-scores');
    this.modalPseudo = document.getElementById('pseudo-modal');
    this.modalHeader = this.modalPseudo.querySelector('.modal-content h3');
    this.pseudoInput = document.getElementById('pseudo-input');
    this.pseudoOKBtn = document.getElementById('pseudo-ok');

    this.retryButton.addEventListener('click', () => {
      location.reload();
    });

    this._setEvents();
  }

  /**
   * @description Permet de lier la fonction SetDirection (controller) à la vue.
   * @param {Function} cb 
   */
  BindSetDirection(cb) {
    this.b_SetDirection = cb;
  }

  /**
   * @private
   * @description Gère les touches fléchées gauche/droite.
   */
  _setEvents() {
    document.addEventListener('keydown', (evt) => {
      if (evt.key === 'ArrowLeft' || evt.key === 'ArrowRight') {
        evt.preventDefault();
        this.b_SetDirection(evt.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    document.addEventListener('keyup', (evt) => {
      if (evt.key === 'ArrowLeft' || evt.key === 'ArrowRight') {
        evt.preventDefault();
        this.b_SetDirection(0);
      }
    });
  }

  /**
   * @description Affiche l'état du jeu ou l'écran de victoire/game over.
   * @param {Object|string} position - {x,y} ou 'Game Over'/'Gagne'
   * @param {number} direction 
   * @param {Array} platforms 
   * @param {number} score 
   * @param {number} facing 
   * @param {number} finishLineY 
   */
  Display(position, direction, platforms, score, facing, finishLineY) {
    this.ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // Cas game over
    if (position === 'Game Over') {
      this._displayGameOver();
      return;
    }
    // Cas victoire
    if (position === 'Gagne') {
      this._displayWin();
      return;
    }

    // Dessin plateformes
    for (let p of platforms) {
      let img;
      if (p.color === 'blue') img = this.platformBlue;
      else if (p.color === 'white') img = this.platformWhite;
      else img = this.platformGreen;
      this.ctx.drawImage(img, p.x, p.y, p.width, p.height);
    }

    // Ligne d'arrivée
    const lineHeight = 100;
    if (finishLineY + lineHeight > 0 && finishLineY < this._canvas.height) {
      this.ctx.drawImage(
        this.finishLine,
        0,
        finishLineY,
        this._canvas.width,
        lineHeight
      );
    }

    // Doodle
    const doodleImg = facing > 0 ? this.doodleRight : this.doodleLeft;
    this.ctx.drawImage(doodleImg, position.x - 20, position.y - 80, 80, 80);

    // Score en temps réel
    this.ctx.fillStyle = '#000';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Score: ' + Math.floor(score), 10, 30);
  }

  /**
   * @private
   * @description Affichage Game Over (canvas + bouton Retry).
   */
  _displayGameOver() {
    this.ctx.fillStyle = '#E63946';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      'Game Over',
      this._canvas.width / 2,
      this._canvas.height / 2
    );
    this.retryButton.style.display = 'block';
  }

  /**
   * @private
   * @description Affichage de la victoire (canvas + bouton Retry).
   */
  _displayWin() {
    this.ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this.ctx.fillStyle = '#28a745';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      'Bravo !',
      this._canvas.width / 2,
      this._canvas.height / 2
    );
    this.retryButton.style.display = 'block';
  }

  /**
   * @description Affiche le tableau des scores (li) puis l'affiche en block.
   * @param {Array} scores 
   */
  ShowTableauDesScores(scores) {
    this.tableauScoresDiv.style.display = 'block';
    this.listeScores.innerHTML = '';
    scores.forEach((item) => {
      let stars = '';
      if (item.score >= 15000) {
        stars = '★★★';
      } else if (item.score >= 10000) {
        stars = '★★';
      } else if (item.score >= 5000) {
        stars = '★';
      }
      const li = document.createElement('li');
      li.textContent = `${stars} ${item.pseudo} : ${item.score}`;
      this.listeScores.appendChild(li);
    });
  }

  /**
   * @description Ouvre une modal pour saisir le pseudo, puis exécute callback(pseudo).
   * @param {Function} onValidate 
   * @param {boolean} isWin 
   */
  ShowPseudoModal(onValidate, isWin) {
    this.modalPseudo.style.display = 'flex';
    this.modalHeader.textContent = isWin
      ? "Bravo, vous avez gagné ! Entrez votre nom"
      : "Entrez votre nom";

    this.pseudoInput.value = '';
    this.pseudoInput.focus();

    this.pseudoOKBtn.onclick = () => {
      let pseudo = this.pseudoInput.value.trim();
      if (!pseudo) pseudo = 'Anonyme';
      this.modalPseudo.style.display = 'none';
      onValidate(pseudo);
    };
  }
}

/********************************************************
 *                   CONTROLLER
 ********************************************************/
/**
 * @class Controller
 * @description Relie Model et View. Gère la boucle d'animation et 
 *              appelle la modal scoreboard en fin de partie.
 */
class Controller {
  constructor(model, view) {
    this._model = model;
    this._view = view;

    // Model -> Controller -> View
    this._model.BindDisplay(this.Display.bind(this));
    // View -> Controller -> Model
    this._view.BindSetDirection(this.SetDirection.bind(this));

    this._gameOver = false;

    // Boucle (timestep)
    this._fps = 60;
    this._frameDuration = 1000 / this._fps;
    this._startTime = Date.now();
    this._lag = 0;

    // Démarre l'update
    this.Update = this.Update.bind(this);
    requestAnimationFrame(this.Update);
  }

  /**
   * @description Appelé par le modèle pour l'affichage. 
   *              Contrôle la fin de partie et déclenche la saisie de pseudo.
   */
  Display(position, direction, platforms, finishLineY) {
    const distance = this._model.scrolledDistance;
    const facing = this._model.facing;

    // On transmet tout à la vue pour dessiner
    this._view.Display(position, direction, platforms, distance, facing, finishLineY);

    // Si Game Over ou Victoire
    if ((position === 'Game Over' || position === 'Gagne') && !this._gameOver) {
      this._gameOver = true;
      const isWin = (position === 'Gagne');

      // Ouvrir la modal pseudo
      this._view.ShowPseudoModal((pseudo) => {
        // 1) Enregistrer le score dans le Model (tableau interne + localStorage)
        this._model.addScore(pseudo, Math.floor(distance));
        // 2) Récupérer la liste pour affichage
        const scores = this._model.getScoreboard();
        // 3) Demander à la View d'afficher ce tableau
        this._view.ShowTableauDesScores(scores);

      }, isWin);
    }
  }

  /**
   * @description Reçoit la direction du doodle (vue) et la passe au modèle.
   * @param {number} newDir - -1, 0, ou 1
   */
  SetDirection(newDir) {
    this._model.direction = newDir;
  }

  /**
   * @description Boucle d'animation (timestep fixe).
   */
  Update() {
    const currentTime = Date.now();
    const deltaTime = currentTime - this._startTime;
    this._lag += deltaTime;
    this._startTime = currentTime;

    while (this._lag >= this._frameDuration) {
      this._model.Move(this._fps);
      this._lag -= this._frameDuration;
    }
    requestAnimationFrame(this.Update);
  }
}

// Instanciation du jeu
const app = new Controller(new Model(), new View());
