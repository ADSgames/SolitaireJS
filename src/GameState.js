/* eslint-disable max-lines */
import Phaser from "phaser";

import Deck from "./Deck.js";
import Card from "./Card.js";
import Piles from "./Piles.js";

export default class GameState extends Phaser.Scene {
  constructor() {
    super({
      active: false,
      key: "GameState",
      type: Phaser.AUTO,
    });
  }

  create() {
    // Game state variables
    this.gameNumber = 1;
    this.score = 0;

    // Drag children array
    this.dragChildren = [];

    // Background
    this.add.image(550 / 2, 0, "img_background");

    // Deck
    this.deck = new Deck(this);

    // Text
    this.scoreText = this.add.text(450, 12, "", {
      fill: "#FFF",
      fontSize: "16px",
    });
    this.gameNumText = this.add.text(10, 12, "", {
      fill: "#FFF",
      fontSize: "16px",
    });

    // Create zones
    Object.keys(Piles.pilePositions).forEach(k => {
      // Additional height for tableau
      let addHeight = 0;
      let addWidth = 0;
      if (k.match(/tableau_*/u)) {
        addHeight = 100;
      } else if (k === "stock") {
        addWidth = 20;
      }

      // Make zone
      const zone = this.add.zone(
        Piles.pilePositions[k].x + addWidth / 2,
        Piles.pilePositions[k].y + addHeight / 2,
        Piles.cardWidth + addWidth,
        Piles.cardHeight + addHeight
      );
      zone.name = k;
      zone.setRectangleDropZone(
        Piles.cardWidth + addWidth,
        Piles.cardHeight + addHeight
      );

      // Draw zone
      if (k === "stock") {
        zone.on("pointerdown", () => this.drawCard(), this);
        zone.setDepth(99);
      }

      // Drop zone visual
      const graphics = this.add.graphics();
      graphics.lineStyle(1, 0xffffff);
      graphics.strokeRect(
        zone.x - Piles.cardWidth / 2 - addWidth / 2,
        zone.y - Piles.cardHeight / 2 - addHeight / 2,
        Piles.cardWidth,
        Piles.cardHeight
      );
    });

    // Start drag card
    this.input.on(
      "dragstart",
      (pointer, gameObject) =>
        gameObject instanceof Card && this.dragCardStart(gameObject),
      this
    );

    // End drag card
    this.input.on(
      "dragend",
      (pointer, gameObject) => gameObject instanceof Card && this.dragCardEnd(),
      this
    );

    // Drop on pile
    this.input.on(
      "drop",
      (pointer, gameObject, dropZone) =>
        gameObject instanceof Card && this.dropCard(gameObject, dropZone),
      this
    );

    // Drag card
    this.input.on(
      "drag",
      (pointer, gameObject, dragX, dragY) =>
        gameObject instanceof Card && this.dragCard(gameObject, dragX, dragY),
      this
    );

    // Redeal button
    const reDealBack = this.add.graphics();
    reDealBack.fillStyle(0xffffff, 1);
    reDealBack.fillRect(10, 5, 80, 18);

    const reDealButton = this.add.text(12, 7, "Redeal", { fill: "#000" });
    reDealButton.setInteractive();
    reDealButton.on(
      "pointerdown",
      () => {
        this.deck.deal(this);
        this.winText.setVisible(false);
      },
      this
    );

    // New deal button
    const newDealBack = this.add.graphics();
    newDealBack.fillStyle(0xffffff, 1);
    newDealBack.fillRect(100, 5, 80, 18);

    const newDealButton = this.add.text(102, 7, "New Deal", { fill: "#000" });
    newDealButton.setInteractive();
    newDealButton.on(
      "pointerdown",
      () => {
        this.deck.shuffle(this.deck.cards);
        this.deck.deal(this);
        this.winText.setVisible(false);
      },
      this
    );

    // Win text
    this.winText = this.add.text(
      20,
      this.cameras.main.height - 40,
      "You Win!",
      { fill: "#FFF", fontSize: "24px" }
    );
    this.winText.setVisible(false);
  }

  drawCard() {
    // Get top card on current stack
    const topCard = this.deck.topCard("stock");

    // Empty stack
    if (topCard) {
      const topCardDisc = this.deck.topCard("discard");
      if (topCardDisc) {
        topCardDisc.flipBack(this);
        topCard.reposition("discard", topCardDisc.position + 1);
      } else {
        topCard.reposition("discard", 0);
      }
      topCard.flip(this);
    } else {
      let currentTop = this.deck.topCard("discard");
      let position = 0;

      while (currentTop) {
        currentTop.reposition("stock", position);
        currentTop.flipBack(this);
        position += 1;
        currentTop = this.deck.topCard("discard");
      }

      if (position > 0) {
        this.score -= 100;
      }
    }
  }

  flipScore(cardStack) {
    if (cardStack.match(/tableau_*/u)) {
      this.score += 5;
    }
  }

  dropScore(zoneStack, cardStack) {
    // Waste to tableau
    if (cardStack === "discard" && zoneStack.match(/tableau_*/u)) {
      this.score += 5;
    }

    // Waste to foundation
    else if (cardStack === "discard" && zoneStack.match(/foundation_*/u)) {
      this.score += 10;
    }

    // Tableau to foundation
    else if (
      cardStack.match(/tableau_*/u) &&
      zoneStack.match(/foundation_*/u)
    ) {
      this.score += 10;
    }

    // Foundation to tableau
    else if (
      cardStack.match(/foundation_*/u) &&
      zoneStack.match(/tableau_*/u)
    ) {
      this.score -= 15;
    }
  }

  dragCardStart(card) {
    // Populate drag children
    this.dragChildren = [];
    if (card.pile.match(/tableau_*/u)) {
      this.dragChildren = this.deck.cardChildren(card);
    } else {
      this.dragChildren.push(card);
    }

    // Set depths
    for (let i = 0; i < this.dragChildren.length; i += 1) {
      this.dragChildren[i].setDepth(100 + i);
    }
  }

  dragCardEnd() {
    // Drop all other cards on top
    for (let i = 0; i < this.dragChildren.length; i += 1) {
      this.dragChildren[i].reposition(
        this.dragChildren[i].pile,
        this.dragChildren[i].position
      );
    }
  }

  dragCard(card, dragX, dragY) {
    // Set positions
    for (let i = 0; i < this.dragChildren.length; i += 1) {
      this.dragChildren[i].x = dragX;
      this.dragChildren[i].y = dragY + i * 16;
    }
  }

  dropCard(card, dropZone) {
    // Get top card on current stack
    const topCard = this.deck.topCard(dropZone.name);

    // Keep old stack name
    const pastStackName = card.pile;

    // Empty stack
    if (!topCard) {
      if (dropZone.name.match(/tableau_*/u)) {
        if (card.value === 13) {
          this.dropScore(dropZone.name, card.pile);
          card.reposition(dropZone.name, 0);
        }
      } else if (dropZone.name.match(/foundation_*/u)) {
        if (card.value === 1) {
          this.dropScore(dropZone.name, card.pile);
          card.reposition(dropZone.name, 0);
        }
      }
    }

    // Tableau
    else if (dropZone.name.match(/tableau_*/u)) {
      if (
        (card.suit + 1) % 2 === topCard.suit % 2 &&
        card.value === topCard.value - 1
      ) {
        this.dropScore(dropZone.name, card.pile);
        card.reposition(dropZone.name, topCard.position + 1);
      }
    }

    // Foundation
    else if (dropZone.name.match(/foundation_*/u)) {
      if (card.suit === topCard.suit && card.value === topCard.value + 1) {
        this.dropScore(dropZone.name, card.pile);
        card.reposition(dropZone.name, topCard.position + 1);
      }
    }

    // Drop all other cards on top
    for (let i = 0; i < this.dragChildren.length; i += 1) {
      if (this.dragChildren[i] !== card) {
        this.dragChildren[i].reposition(card.pile, card.position + i);
      }
    }

    // Flip top card on past stack
    const topCardNew = this.deck.topCard(pastStackName);
    if (topCardNew && topCardNew !== card && !topCardNew.flipped) {
      topCardNew.flip(this);
      this.flipScore(topCardNew.pile);
    }
  }

  update() {
    // Ensure score is within range
    if (this.score < 0) {
      this.score = 0;
    }

    // Win
    if (
      this.deck.countCards("foundation_0") +
        this.deck.countCards("foundation_1") +
        this.deck.countCards("foundation_2") +
        this.deck.countCards("foundation_3") ===
      52
    ) {
      this.winText.setVisible(true);
    }

    // Display lives
    this.scoreText.setText(`SCORE: ${this.score}`);

    // Display current level
    this.gameNumText.setText("");
  }
}
