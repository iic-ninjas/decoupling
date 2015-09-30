var canvas = document.getElementById("surface");
var ctx = canvas.getContext("2d");
var width;
var height;

var useEvents = false;
var badCode = true;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  width = canvas.width;
  height = canvas.height;
}

resizeCanvas();

window.addEventListener("resize", resizeCanvas, true);

var units = [];
var constraints = [];
var messages = [];
var numTotalMessages = 0;

function v2(x, y) {
  return {
    x: x,
    y: y
  };
}

function distanceSq(v2a, v2b) {
  var dx = v2a.x - v2b.x;
  var dy = v2a.y - v2b.y;
  return dx*dx + dy*dy;
}

function lerp(t, start, end) {
  return (1-t)*start + t*end;
}

function v2lerp(t, start, end) {
  return v2(lerp(t, start.x, end.x), lerp(t, start.y, end.y));
}

function makeConstraint(idx1, idx2) {
  constraints.push({
    idx1: idx1,
    idx2: idx2,
    distanceSq: distanceSq(units[idx1], units[idx2])
  });
}

function sendMessage(sourceIdx, targetIdx, duration) {
  messages.push({
    sourceIdx: sourceIdx,
    targetIdx: targetIdx,
    duration: duration,
    startTime: Date.now(),
    progress: 0
  });
  numTotalMessages++;
  document.getElementById("num_messages").textContent = numTotalMessages;
}

function constraintExists(idx1, idx2) {
  for (var i = 0; i < constraints.length; ++i) {
    if (constraints[i].idx1 == idx1 && constraints[i].idx2 == idx2) {
      return true;
    }
  }

  return false;
}

function clear() {
  ctx.clearRect(0, 0, width, height);
}

function drawUnit(v2pos, highlight) {
  if (highlight) {
    ctx.beginPath();
    ctx.fillStyle = "grey";
    ctx.arc(v2pos.x, v2pos.y, 9, 0, 2*Math.PI);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.fillStyle = "red";
  ctx.arc(v2pos.x, v2pos.y, 7, 0, 2*Math.PI);
  ctx.fill();
}

function drawConstraint(idx1, idx2) {
  var v2pos1 = units[idx1];
  var v2pos2 = units[idx2];
  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.moveTo(v2pos1.x, v2pos1.y);
  ctx.lineTo(v2pos2.x, v2pos2.y);
  ctx.stroke();
}

function drawMessage(sourceIdx, targetIdx, progress) {
  var v2start = units[sourceIdx];
  var v2end = units[targetIdx];
  var messagePos = v2lerp(progress, v2start, v2end);
  ctx.beginPath();
  ctx.fillStyle = "#00ff00";
  ctx.arc(messagePos.x, messagePos.y, 5, 0, 2*Math.PI);
  ctx.fill();
}

function drawEventMessage(sourceIdx, targetIdx, progress) {
  var v2start = units[sourceIdx];
  var v2end = units[targetIdx];
  var messagePos = v2lerp(progress, v2start, v2end);
  var distance = Math.sqrt(distanceSq(v2start, messagePos));
  ctx.beginPath();
  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 1;
  ctx.arc(v2start.x, v2start.y, distance, 0, 2*Math.PI);
  ctx.stroke();
}

function organize() {
  if (badCode) {
    makeGoodCode();
    document.getElementById("organize").textContent = "Bad code";
  } else {
    makeBadCode();
    document.getElementById("organize").textContent = "Good code";
  }
  badCode = !badCode;
}

function updateMessages() {
  var remainingMessages = [];
  var currentTime = Date.now();
  for (var i = 0; i < messages.length; ++i) {
    messages[i].progress = (currentTime - messages[i].startTime) / messages[i].duration;
    if (messages[i].progress < 1) {
      remainingMessages.push(messages[i]);
    } else {
      generateMessages(messages[i].targetIdx);
    }
  }

  messages = remainingMessages;
}

function generateMessages(sourceIdx) {
  if (sourceIdx > -1) {
    if (Math.random()*10 > 6) {
      var relatedConstrains = [];
      for (var i = 0; i < constraints.length; ++i) {
        if (constraints[i].idx1 == sourceIdx || constraints[i].idx2 == sourceIdx) {
          relatedConstrains.push(constraints[i]);
        }
      }

      var numMessages = Math.floor(Math.random()*3+1);

      for (var i = 0; i < numMessages; ++i) {
        var chosenConstraint = relatedConstrains[Math.floor(Math.random()*relatedConstrains.length)];
        sendMessage(sourceIdx, (chosenConstraint.idx1 == sourceIdx ? chosenConstraint.idx2 : chosenConstraint.idx1), 1000);
      }
    }
  } else {
    if (Math.random() > 0.95) {
      var constraint = constraints[Math.floor(Math.random()*constraints.length)];
      if (Math.random() >= 0.5) {
        sendMessage(constraint.idx1, constraint.idx2, 1000);
      } else {
        sendMessage(constraint.idx2, constraint.idx1, 1000);
      }
    }
  }
}

function resolveConstrains() {
  for (var i = 0; i < constraints.length; ++i) {
    var constraint = constraints[i];

    var diff = v2(
        units[constraint.idx1].x - units[constraint.idx2].x,
        units[constraint.idx1].y - units[constraint.idx2].y
    );

    var diffLengthSq = diff.x*diff.x + diff.y*diff.y;

    if (Math.abs(diffLengthSq - constraint.distanceSq) > 10) {
      var currentDistance = Math.sqrt(diffLengthSq);
      var targetDistance = Math.sqrt(constraint.distanceSq);
      var moveBy = targetDistance - currentDistance;
      diff.x /= currentDistance;
      diff.y /= currentDistance;

      diff.x *= moveBy;
      diff.y *= moveBy;

      var weight1 = 0.5;
      var weight2 = 0.5;

      if (constraint.idx1 == draggedIdx) {
        weight1 = 0;
        weight2 = 1;
      } else if (constraint.idx2 == draggedIdx) {
        weight1 = 1;
        weight2 = 0;
      }

      units[constraint.idx1] = v2(
          units[constraint.idx1].x + diff.x*weight1,
          units[constraint.idx1].y + diff.y*weight1
      );

      units[constraint.idx2] = v2(
          units[constraint.idx2].x - diff.x*weight2,
          units[constraint.idx2].y - diff.y*weight2
      );
    }
  }
}

function spaceOut() {
  for (var i = 0; i < units.length; ++i) {
    for (var j = 0; j < units.length; ++j) {
      if (j != i) {
        var first = units[i];
        var second = units[j];

        var diff = v2(
            first.x - second.x,
            first.y - second.y
        );

        var diffLengthSq = diff.x*diff.x + diff.y*diff.y;
        if (diffLengthSq < 225) {
          var currentDistance = Math.sqrt(diffLengthSq);
          var targetDistance = 15;
          var moveBy = targetDistance - currentDistance;

          if (currentDistance > 0) {
            diff.x /= currentDistance;
            diff.y /= currentDistance;
            diff.x *= moveBy;
            diff.y *= moveBy;
          } else {
            diff.x = 1;
          }

          var weight1 = 0.5;
          var weight2 = 0.5;

          if (i == draggedIdx) {
            weight1 = 0;
            weight2 = 1;
          } else if (j == draggedIdx) {
            weight1 = 1;
            weight2 = 0;
          }

          first.x += diff.x*weight1;
          first.y += diff.y*weight1;

          second.x -= diff.x*weight2;
          second.y -= diff.y*weight2;
        }
      }
    }
  }
}

function frame() {
  clear();

  updateMessages();

  if (!useEvents) {
    for (var i = 0; i < constraints.length; ++i) {
      drawConstraint(constraints[i].idx1, constraints[i].idx2);
    }
  }

  if (useEvents) {
    for (var i = 0; i < messages.length; ++i) {
      drawEventMessage(messages[i].sourceIdx, messages[i].targetIdx, messages[i].progress);
    }
  } else {
    for (var i = 0; i < messages.length; ++i) {
      drawMessage(messages[i].sourceIdx, messages[i].targetIdx, messages[i].progress);
    }
  }

  for (var i = 0; i < units.length; ++i) {
    drawUnit(units[i], i == highlightedIdx);
  }

  generateMessages(-1);

  if (!useEvents) {
    resolveConstrains();
  }
  spaceOut();

  requestAnimationFrame(frame);
}

function makeBadCode() {
  units = [];
  constraints = [];
  messages = [];
  numTotalMessages = 0;

  for (var i = 0; i < 70; ++i) {
    units.push(v2(Math.random()*width/3 + width/3, Math.random()*height/3 + height/3));
  }
  for (var i = 0; i < units.length; ++i) {
    units[i].x = (i % 7) * 50 + 200;
    units[i].y = Math.floor(i / 7) * 50 + 200;
  }

  for (var i = 0; i < units.length; ++i) {
    var targetIdx;
    var numConstraints = Math.floor(Math.random()*2)+1;
    for (var c = 0; c < numConstraints; ++c) {
      do {
        targetIdx = Math.floor(Math.random()*units.length);
      } while(constraintExists(i, targetIdx) || i == targetIdx);
      makeConstraint(i, targetIdx);
    }
  }
}

function makeGoodCode() {
  units = [];
  constraints = [];
  messages = [];
  numTotalMessages = 0;

  units.push(v2(width*0.5, height*0.1));
  makeChildren(1, 0, 3, width*0.5);
}

function makeChildren(level, parentIdx, numChildren, totalWidth) {
  if (level == 5) { return; }
  var uParent = units[parentIdx];
  for (var i = 0; i < numChildren; ++i) {
    var child = v2(uParent.x + i*(totalWidth/(numChildren-1)) - totalWidth/2, uParent.y + height*0.1);
    units.push(child);
    makeConstraint(parentIdx, units.length-1);
    makeChildren(level+1, units.length-1, 3, totalWidth/numChildren);
  }
}


makeBadCode();
frame();

var draggedIdx = -1;
var highlightedIdx = -1;
var wasDown = false;

document.body.addEventListener("mousedown", function(ev) {
  if (wasDown == false) {
    wasDown = true;

    for (var i = 0; i < units.length; ++i) {
      if (Math.abs(ev.clientX - units[i].x) < 5 && Math.abs(ev.clientY - units[i].y) < 5) {
        draggedIdx = i;
        highlightedIdx = i;
        break;
      }
    }
  }
});

document.body.addEventListener("mousemove", function(ev) {
  if (draggedIdx >= 0) {
    units[draggedIdx].x = ev.clientX;
    units[draggedIdx].y = ev.clientY;
  } else {
    highlightedIdx = -1;
    for (var i = 0; i < units.length; ++i) {
      if (Math.abs(ev.clientX - units[i].x) < 5 && Math.abs(ev.clientY - units[i].y) < 5) {
        highlightedIdx = i;
        break;
      }
    }
  }
});

document.body.addEventListener("mouseup", function(ev) {
  draggedIdx = -1;
  wasDown = false;
});


document.getElementById("toggle").addEventListener("click", function() {
  useEvents = !useEvents;
  if (useEvents) {
    document.getElementById("toggle").textContent = "Coupling mode";
  } else {
    document.getElementById("toggle").textContent = "Events mode";
  }
});

document.getElementById("organize").addEventListener("click", function() {
  organize();
});
