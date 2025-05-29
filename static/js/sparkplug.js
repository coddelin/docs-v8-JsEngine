const flipStacksButton = document.getElementById('flipStacksButton');
let stacksAreFlipped = Math.random() < 0.5;
function updateStacks() {
  if (stacksAreFlipped) {
    document.body.classList.add('flipped');
    flipStacksButton.textContent = 'I think stacks grow downwards';
  } else {
    document.body.classList.remove('flipped');
    flipStacksButton.textContent = 'I think stacks grow upwards';
  }
}
updateStacks();
flipStacksButton.onclick = () => {
  stacksAreFlipped = !stacksAreFlipped;
  updateStacks();
};
