# Projet Doodlejump

## Étudiants

- Baptiste Dauphin
- Alexis Déhu

## Accessibilité au projet

Le code du projet est retrouvable dans le fichier [app.js](https://github.com/xeylou/DEHU-DAUPHIN-DOODLEJUMP/blob/main/app.js).


## Diagramme des fonctions

```txt
                +-----------------------+
                |      Contrôleur       |
                +-----------------------+
                | - SetDirection()      | <-- (Callback vue setter direction)
                | - Display()           | <-- (Callback vue modal win/gameover + tab score)
                | - handleGameOver()    | <-- (Setter gameover + ajout score)
                | - Update()            | <-- (Boucle fenêtre)
                +-----------------------+
                        ^  |
                        |  |
        (1) Input       |  |  (2) MÀJ modèle
        (flèches)       |  |
                        |  |
                        |  |
                        |  v
               +--------------------------------+
               |            Modèle              |
               +--------------------------------+
               | - Move(fps)                    | <-- (Callback affichage, MÀJ difficulté
               |                                |        + endings car requestAnimationFrame)
               | - facing (getter)              | <-- (Savoir quand tourner Doodle avec touche)
               | - direction (getter/setter)    | <-- (Pour avoir et retourner orientation)
               | - position (getter)            | <-- (dodo ou gagné?)
               | - scrolledDistance (getter)    | <-- (Pour score + diffculté)
               | - BindDisplay()                | <-- (Callback vue par contrôleur)
               | - _updateDifficulty()          | <-- (MÀJ du gap, nb plateformes, distance)
               | - _createPlatforms()           | <-- (Génère plateformes jusqu'à 2k au dessus)
               | - _generateNonOverlappingX()   | <-- (Espacement x et y de 1 Doodle min.)
               | - _getPlatformColor()          | <-- (Changement apparition selon difficulté)
               | - _updatePlatforms()           | <-- (Déplacement plateformes bleues)
               | - addScore() (setter)          | <-- (Ajoute score)
               | - getScores() (getter)         | <-- (Récupère tableau scores)
               | - _loadScores()                | <-- (Charge scores chargés localStorage)
               | - _saveScores()                | <-- (Sauvegarde scores avec localStorage)
               +--------------------------------+
                         ^   |
    (-) Input (flèches)  |   | (3) Notifie la vue
                         |   v
               +--------------------------------+
               |             Vue                |
               +--------------------------------+
               | - Display()                    | <-- (Met à jour l'affichage canva + endings)
               | - BindSetDirection()           | <-- (Lie touches au controller)
               | - displayScores()              | <-- (Affiche les scores)
               | - showPseudoModal()            | <-- (Demande un pseudo)
               | - _displayGameOver()           | <-- (Affiche loose)
               | - _displayWin()                | <-- (Affiche win)
               | - _setEvents()                 | <-- (Gère touches + impossible default)
               +--------------------------------+
                        |
                        v
             (4) Affichage navigateur

```
