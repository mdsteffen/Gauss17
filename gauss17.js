function SolveQuadratic(a, b, c) {
	var ret = [];
	var discriminant = b * b - 4.0 * a * c;

	if (a == 0 || discriminant < 0)
		return ret;

	if (discriminant == 0) {
		ret.push(-b / (2.0 * a));
	}
	else {
		discriminant = Math.sqrt(discriminant);
		ret.push((-b + discriminant) / (2.0 * a));
		ret.push((-b - discriminant) / (2.0 * a));
	}

	return ret;
}

function fmod(x, y) {
	if (x >= 0) {
		var absy = Math.abs(y);
		return x - Math.floor(x / absy) * absy;
	}

	return -fmod(Math.abs(x), Math.abs(y));
}

function IEEEremainder(x, y) {
	return (x - (y * Math.round(x / y)));
}


function distanceBetween(theta1, theta2) {
	var d = fmod(theta2 - theta1, Math.PI * 2);
	d = IEEEremainder(d, Math.PI * 2);
	return Math.abs(d);
}


function Point(x, y) {
	this.x = x;
	this.y = y;
	this.strokeStyle = '#000000';
}

Point.prototype.Draw = function () {
	context.beginPath();
	context.strokeStyle = this.strokeStyle;
	context.arc(this.x, this.y, 3 / scale, 0, 360, false);
	context.stroke();
}


Point.prototype.distanceTo = function (p) {  // Point p
	var dx = p.x - this.x;
	var dy = p.y - this.y;
	return Math.sqrt(dx * dx + dy * dy);
}

function Intersection(p, obj1, obj2) {  // Point p
	this.point = p;
	this.obj1 = obj1;
	this.obj2 = obj2;
}

// Selection tool only responds to mouseReleased. The following are other required functions
function SelectionTool() {}
SelectionTool.prototype.onMouseMoved = function () {}
SelectionTool.prototype.onMouseDragged = function () {}
SelectionTool.prototype.onMousePressed = function () {}
SelectionTool.prototype.Draw = function () {}

SelectionTool.prototype.onMouseReleased = function () {
	var pointOnShape = getClosestPointOnShape(mousePoint);

	if (pointOnShape.point != null) {
		var d = pointOnShape.point.distanceTo(mousePoint);
		if (d < 10 / scale)
			selectedShape = pointOnShape.shape;
	}
}

function CompassTool() {
	this.p1Selected = false;
	this.p2Selected = false;
	this.p1 = new Point(0, 0);
	this.p2 = new Point(100, 0);
	this.R = this.p1.distanceTo(this.p2);
	this.circle = new Circle(this.p1.x, this.p1.y, this.R);
	this.theta1Draw = -1;  // Negative value specifies unset
	this.theta2Draw = -1;  // Negative value specifies unset
	this.THETA_EPSILON = 0.000001;
}

CompassTool.prototype.onMouseMoved = function () {
	curserPoint = this.circle.findClosestPoint(mousePoint);
	usingIntersection = false;
}

CompassTool.prototype.onMouseDragged = function () {
	if (this.p1Selected || this.p2Selected) {
		if (this.p1Selected) {
			var vx = this.p2.x - this.p1.x;
			var vy = this.p2.y - this.p1.y;
			this.p1 = curserPoint;
			this.p2 = new Point(this.p1.x + vx, this.p1.y + vy);
			this.circle = new Circle(this.p1.x, this.p1.y, this.R);
		}
		if (this.p2Selected) {
			this.p2 = curserPoint;
			this.R = this.p1.distanceTo(this.p2);
			this.circle = new Circle(this.p1.x, this.p1.y, this.R);
		}
		return;
	}

	curserPoint = this.circle.findClosestPoint(mousePoint);
	usingIntersection = false;

	var theta = this.circle.getTheta(curserPoint);

	var dTheta1 = distanceBetween(theta, this.theta1Draw);
	var dTheta2 = distanceBetween(theta, this.theta2Draw);

	if (dTheta1 < dTheta2) {
		// Push theta1
		if (theta > this.theta2Draw) {
			this.theta2Draw = this.theta2Draw + Math.PI * 2;
			this.theta1Draw = theta;
			if (this.theta2Draw - this.theta1Draw > Math.PI * 2) {
				this.theta2Draw = this.theta1Draw + Math.PI * 2;
			}
		}
		else if (theta < this.theta1Draw) {
			this.theta1Draw = theta;
			if (this.theta2Draw - this.theta1Draw > Math.PI * 2) {
				this.theta2Draw = this.theta1Draw + Math.PI * 2;
			}
		}
	}
	else {
		// Push theta2
		if (theta < this.theta1Draw)
			theta = theta + Math.PI * 2;
		if (theta > this.theta2Draw)
			this.theta2Draw = theta;
	}
}

CompassTool.prototype.onMousePressed = function () {
	var d1 = mousePoint.distanceTo(this.p1);
	var d2 = mousePoint.distanceTo(this.p2);

	this.p1Selected = false;
	this.p2Selected = false;

	if (d1 < d2 && d1 < 10 / scale)
		this.p1Selected = true;
	else if (d2 < 10 / scale)
		this.p2Selected = true;

	if (this.p1Selected || this.p2Selected)
		return;

	var c = new Circle(this.p1.x, this.p1.y, this.R);
	var p = c.findClosestPoint(mousePoint);

	// Starting both points at same location causes problems
	this.theta1Draw = c.getTheta(p);
	this.theta2Draw = this.theta1Draw + this.THETA_EPSILON;
}

CompassTool.prototype.onMouseReleased = function () {
	this.p1Selected = false;
	this.p2Selected = false;

	if (this.theta1Draw > 0 && this.theta2Draw > 0) {
		if (this.theta2Draw < this.theta1Draw)
			this.theta2Draw = this.theta2Draw + Math.PI * 2;
		addArc(new Arc(this.p1.x, this.p1.y, this.R, this.theta1Draw / Math.PI * 180, (this.theta2Draw - this.theta1Draw) / Math.PI * 180));
	}
	this.theta1Draw = -1;
	this.theta2Draw = -1;
}

CompassTool.prototype.Draw = function () {

	if (this.theta1Draw > 0 && this.theta2Draw > 0) {
		context.beginPath();
		context.strokeStyle = "#FFAAAA";
		var extent = this.theta2Draw - this.theta1Draw;
		if (extent < 0) 
			extent = extent + Math.PI * 2;

		var x = this.p1.x - this.R;
		var y = this.p1.y - this.R;

		context.arc(this.p1.x, this.p1.y, this.R, this.theta1Draw, this.theta2Draw, false);
		context.stroke();
	}

	var l = 5.0 / scale;
	context.beginPath();
	context.strokeStyle = "#00AA00";
	context.moveTo(this.p1.x - l, this.p1.y - l);
	context.lineTo(this.p1.x + l, this.p1.y + l);
	context.moveTo(this.p1.x - l, this.p1.y + l);
	context.lineTo(this.p1.x + l, this.p1.y - l);
	context.stroke();
	context.beginPath();
	context.arc(this.p1.x, this.p1.y, 3/scale, 0, 2 * Math.PI, false);
	context.stroke();

	context.beginPath();
	context.strokeStyle = "#FF0000";
	context.moveTo(this.p2.x - l, this.p2.y - l);
	context.lineTo(this.p2.x + l, this.p2.y + l);
	context.moveTo(this.p2.x - l, this.p2.y + l);
	context.lineTo(this.p2.x + l, this.p2.y - l);
	context.stroke();
}

function StraightEdgeTool() {
	this.p1Selected = false;
	this.p2Selected = false;
	this.p1 = new Point(0, 0);
	this.p2 = new Point(100, 0);
	this.p1Draw = null;
	this.p2Draw = null;
}

StraightEdgeTool.prototype.onMouseDragged = function () {
	// Handle moving the straight edge points first
	if (this.p1Selected || this.p2Selected) {
		if (this.p1Selected)
			this.p1 = curserPoint;
		if (this.p2Selected)
			this.p2 = curserPoint;
		return;
	}

	var l = new Line(this.p1, this.p2);
	curserPoint = l.findClosestPoint(mousePoint);
	usingIntersection = false;

	if (this.p1.y != this.p2.y) {  // non horizontal line
		if (curserPoint.y < this.p1Draw.y)  // p1Draw will be point with least y value
			this.p1Draw = curserPoint;
		if (curserPoint.y > this.p2Draw.y)  // p2Draw will be point with greatest y value
			this.p2Draw = curserPoint;
	}
	else {  // special case - horizontal line
		if (curserPoint.x < this.p1Draw.x)  // p1Draw will be point with least x value
			this.p1Draw = curserPoint;
		if (curserPoint.x > this.p2Draw.x)  // p2Draw will be point with greatest x value
			this.p2Draw = curserPoint;
	}
}

StraightEdgeTool.prototype.onMouseMoved = function () {
	var l = new Line(this.p1, this.p2);
	curserPoint = l.findClosestPoint(mousePoint);
	usingIntersection = false;
}

StraightEdgeTool.prototype.onMousePressed = function () {
	var d1 = mousePoint.distanceTo(this.p1);
	var d2 = mousePoint.distanceTo(this.p2);

	this.p1Selected = false;
	this.p2Selected = false;

	if (d1 < d2 && d1 < 10 /scale)
		this.p1Selected = true;
	else if (d2 < 10 / scale)
		this.p2Selected = true;

	if (this.p1Selected || this.p2Selected)
		return;

	var l = new Line(this.p1, this.p2);
	var p = l.findClosestPoint(mousePoint);

	this.p1Draw = p;
	this.p2Draw = p;
}

StraightEdgeTool.prototype.onMouseReleased = function () {
	this.p1Selected = false;
	this.p2Selected = false;

	if (this.p1Draw != null && this.p2Draw != null) {
		var l = new LineSegment(this.p1Draw, this.p2Draw);
		addLine(l);
	}

	this.p1Draw = null;
	this.p2Draw = null;
}

StraightEdgeTool.prototype.Draw = function () {

	if (this.p1Draw != null && this.p2Draw != null) {
		context.beginPath();
		context.strokeStyle = "#FFAAAA";
		context.moveTo(this.p1Draw.x, this.p1Draw.y);
		context.lineTo(this.p2Draw.x, this.p2Draw.y);
		context.stroke();
	}

	var l = 5.0 / scale;
	context.beginPath();
	context.strokeStyle = "#00AA00";
	context.moveTo(this.p1.x - l, this.p1.y - l);
	context.lineTo(this.p1.x + l, this.p1.y + l);
	context.moveTo(this.p1.x - l, this.p1.y + l);
	context.lineTo(this.p1.x + l, this.p1.y - l);
	context.stroke();

	context.beginPath();
	context.strokeStyle = "#FF0000";
	context.moveTo(this.p2.x - l, this.p2.y - l);
	context.lineTo(this.p2.x + l, this.p2.y + l);
	context.moveTo(this.p2.x - l, this.p2.y + l);
	context.lineTo(this.p2.x + l, this.p2.y - l);
	context.stroke();
}

function LineSegment(p1, p2) {
	this.p1 = p1;
	this.p2 = p2;
	this.strokeStyle = '#000000';

	// cached values
	this.lx = p2.x - p1.x;
	this.ly = p2.y - p1.y;
	this.l = p1.distanceTo(p2);
	this.l2 = this.l * this.l;
}

LineSegment.prototype.Draw = function () {
	context.beginPath();
	context.strokeStyle = this.strokeStyle;
	context.moveTo(this.p1.x, this.p1.y);
	context.lineTo(this.p2.x, this.p2.y);
	context.stroke();
}

LineSegment.prototype.findClosestPoint = function (p) {
	if (this.l == 0)
		return this.p1

	// a is the percent distance from p1 to p2 that the closest point resides
	var a = 1.0 / (this.l2) *
		(this.lx * (p.x - this.p1.x) + this.ly * (p.y - this.p1.y));

	if (a < 0) {
		return this.p1;
	}
	if (a > 1) {
		return this.p2;
	}

	return new Point(this.p1.x + a * this.lx, this.p1.y + a * this.ly);
}

LineSegment.prototype.findLineIntersection = function (line) {

	var ret = [];
	if (this.l == 0)
		return ret;

	var onedivlsq = 1.0 / (this.l2);

	var a = onedivlsq * this.lx;
	var b = onedivlsq * this.ly;
	var c = -onedivlsq * (this.p1.x * this.lx + this.p1.y * this.ly);
	var d = -onedivlsq * this.ly;
	var e = onedivlsq * this.lx;
	var f = onedivlsq * (this.p1.x * this.ly - this.p1.y * this.lx);


	// Find translated points
	var q1x = a * line.p1.x + b * line.p1.y + c;
	var q1y = d * line.p1.x + e * line.p1.y + f;

	var q2x = a * line.p2.x + b * line.p2.y + c;
	var q2y = d * line.p2.x + e * line.p2.y + f;

	// No chance for intersection

	if ((q1y > 0 && q2y > 0) || (q1y < 0 && q2y < 0)) {
		return ret;
	}

	if (q1y == q2y) {
		// lines are parallel
		return ret;
	}

	// Find intersection with x axis
	var percent = q1y / (q1y - q2y);

	// Find x value of intersection
	var xval = q1x + percent * (q2x - q1x);

	if (xval < 0 || xval > 1) {
		// No intersection
		return ret;
	}

	var p = new Point(this.p1.x + this.lx * xval, this.p1.y + this.ly * xval);
	ret.push(new Intersection(p, this, line));
	return ret;
}

function Circle(x, y, r) {
	this.c = new Point(x, y);
	this.r = r;
}

Circle.prototype.getPoint = function (theta) {
	return new Point(this.r * Math.cos(theta) + this.c.x, this.r * Math.sin(theta) + this.c.y);
}

Circle.prototype.findClosestPoint = function (p) {
	var l = p.distanceTo(this.c);

	if (l == 0)
		return this.c;

	var nx = (p.x - this.c.x) / l;
	var ny = (p.y - this.c.y) / l;

	return new Point(nx * this.r + this.c.x, ny * this.r + this.c.y);
}

Circle.prototype.getTheta = function (p) {
	var ret = 0.0;
	var vx = p.x - this.c.x;
	var vy = p.y - this.c.y;
	var d2 = vx * vx + vy * vy;
	if (d2 == 0) // radius is 0
		return ret;

	var angle = Math.atan2(vy, vx);
	if (angle < 0)
		return angle + Math.PI * 2;

	return angle;
}

function Line(p1, p2) {
	this.p1 = p1;
	this.l = p1.distanceTo(p2);
	this.lx = p2.x - p1.x;
	this.ly = p2.y - p1.y;
}

Line.prototype.findClosestPoint = function (p) {
	if (this.l == 0)
		return this.p1;

	// a is the percent distance from p1 to p2 that the closest ponit resides
	var a = 1 / (this.l * this.l) *
		(this.lx * (p.x - this.p1.x) + this.ly * (p.y - this.p1.y));

	return new Point(this.p1.x + a * this.lx, this.p1.y + a * this.ly);
}

function Arc(x, y, r, theta1, extent) {
	this.x = x;
	this.y = y;
	this.c = new Point(x, y);
	this.r = r;
	this.theta1 = theta1 / 180 * Math.PI;
	this.extent = extent / 180 * Math.PI;
	this.theta2 = this.theta1 + this.extent;
	this.strokeStyle = '#000000';
}

Arc.prototype.Draw = function () {
	context.beginPath();
	context.strokeStyle = this.strokeStyle;
	context.arc(this.x, this.y, this.r, this.theta1, this.theta1 + this.extent, false);
	context.stroke();

	if(snapToCircleCenters) {
		context.beginPath();
		context.fillStyle = this.strokeStyle;
		context.arc(this.x, this.y, 2/scale, 0, Math.PI * 2, false);
		context.fill();
	}
}

Arc.prototype.getPoint = function (theta) {
	return new Point(this.r * Math.cos(theta) + this.x, this.r * Math.sin(theta) + this.y);
}

Arc.prototype.getP1 = function () {
	return this.getPoint(-this.theta1);
}

Arc.prototype.getP2 = function () {
	return this.getPoint(-this.theta2);
}

Arc.prototype.isThetaIn = function (angle) {
	angle = fmod(angle, 2 * Math.PI);
	if (angle < 0)
		angle = angle + 2 * Math.PI;

	if (angle >= this.theta1 && angle <= this.theta2)
		return true;

	// This handles cases like the following:
	// arc theta1 = 40, arc extent = 340, angle = 10
	angle = angle + 2 * Math.PI;
	if (angle >= this.theta1 && angle <= this.theta2)
		return true;

	return false;
}

Arc.prototype.findClosestPoint = function (p) {
	var c = new Point(this.x, this.y);
	var l = p.distanceTo(c);

	if (l == 0)
		return c;

	var nx = (p.x - this.x) / l;
	var ny = (p.y - this.y) / l;

	var closeP = new Point(nx * this.r + this.x, ny * this.r + this.y);
	var closeD = p.distanceTo(closeP);

	// If we are closer to the center than to the edge, return center
	if (snapToCircleCenters)
		if (closeD > l)
			return c;

	var theta = Math.atan2(ny, nx);
	if (this.isThetaIn(theta))
		return closeP;

	// Need to check two end points to see which is closest
	closeP = c;
	closeD = l;

	var p1 = this.getP1();
	var d1 = p1.distanceTo(p);

	if (d1 < closeD) {
		closeD = d1;
		closeP = p1;
	}

	var p2 = this.getP2();
	var d2 = p2.distanceTo(p);

	if (d2 < closeD) {
		closeD = d2;
		closeP = p2;
	}

	return closeP;
}
Arc.prototype.findLineIntersection = function (line) {
	var ret = [];
	// r = 0 is degenerate - no intersections
	if (this.r == 0)
		return ret;

	// Find vector between p1 and p2
	var vx = line.p2.x - line.p1.x;
	var vy = line.p2.y - line.p1.y;

	// Find p1 translated such that the arc circle is at origin
	var qx = line.p1.x - this.x;
	var qy = line.p1.y - this.y;

	// Equations for line between translated points, parameterized by a:
	// a = 0 is point q, a = 1 is other point
	// x = qx + a * vx
	// y = qy + a * vy

	// Equation after substituting point equation into equation for circle at origin:
	// (vx^2 + vy^2) * a^2 + 2 * (qx * vx + qy * vy) * a + (qx^2 + qy^2 - R^2) = 0

	// Solve above for a using quadratic formula
	var roots = SolveQuadratic(vx * vx + vy * vy,
		2 * (qx * vx + qy * vy),
		qx * qx + qy * qy - this.r * this.r);

	for (i in roots) {
		// Don't consider a values < 0 or > 1. These are on the line, but outside the line segment
		var a = roots[i];
		if (a >= 0 && a <= 1) {
			// Easier to check theta extents with circle at origin
			// Find intersection point on translated line
			var x = qx + a * vx;
			var y = qy + a * vy;

			// Find angle on circle corresponding to this point and see if it is in extent
			var theta = Math.atan2(y, x);
			if (this.isThetaIn(theta)) {
				// Translate point back from origin
				x = x + this.x;
				y = y + this.y;
				var intersection = new Intersection(new Point(x, y), this, line);
				ret.push(intersection);
			}
		}
	}
	return ret;
}

Arc.prototype.findArcIntersection = function (a) {
	var ret = [];

	// translate second arc center such that the first arc center is at origin
	var vx = a.x - this.x;
	var vy = a.y - this.y;

	// Find distance between circles
	var d = Math.sqrt(vx * vx + vy * vy);
	if (d == 0)   // circles have same center
		return ret;

	// rotation angle such that rotating translated center by -theta is rotated to (d, 0)
	var cos = vx / d;
	var sin = vy / d;
	var theta = Math.atan2(sin, cos);

	// x value where rotated circles intersect.
	// Solved by using the following two equations:
	// x^2 + y^2 = R1^2
	// (x-d)^2 + y^2 = R2^2
	var x = (d * d + this.r * this.r - a.r * a.r) / (2.0 * d);

	// Circles don't intersect
	if (x < -this.r || x > this.r)
		return ret;

	// y values where rotated circles intersect
	var y = Math.sqrt(this.r * this.r - x * x);

	// rotate first intersection point back
	var x1 = cos * x - sin * y;
	var y1 = sin * x + cos * y;

	// Find angle for point 1 on circle 1
	var angle = Math.atan2(y1, x1);
	if (this.isThetaIn(angle)) {
		// Find angle for point 1 on circle 2
		var angle2 = Math.atan2(y1 - vy, x1 - vx);
		if (a.isThetaIn(angle2)) {
			var p = new Point(x1 + this.x, y1 + this.y);
			var i = new Intersection(p, this, a);
			ret.push(i);
		}
	}

	// rotate second intersection point back
	var x2 = cos * x + sin * y;
	var y2 = sin * x - cos * y;

	// Find angle for point 2 on circle 1
	angle = Math.atan2(y2, x2);
	if (this.isThetaIn(angle)) {
		// Find angle for point 2 on circle 2
		var angle2 = Math.atan2(y2 - vy, x2 - vx);
		if (a.isThetaIn(angle2)) {
			var p = new Point(x2 + this.x, y2 + this.y);
			var i = new Intersection(p, this, a);
			ret.push(i);
		}
	}

	return ret;
}

function addArc(arc) {
	for (i in lines) {
		intersection = arc.findLineIntersection(lines[i]);
		for (j in intersection) {
			intersections.push(intersection[j]);
		}
	}
	for (i in arcs) {
		intersection = arc.findArcIntersection(arcs[i]);
		for (j in intersection) {
			intersections.push(intersection[j]);
		}
	}

	arcs.push(arc);
}

function removeObject(o) {
	var i = intersections.length;
	while (i--) {
		if (intersections[i].obj1 == o || intersections[i].obj2 == o)
			intersections.splice(i, 1);
	}

	var i = arcs.length;
	while (i--) {
		if (arcs[i] == o) {
			arcs.splice(i, 1);
			return;
		}
	}

	var i = lines.length;
	while (i--) {
		if (lines[i] == o) {
			lines.splice(i, 1);
			return;
		}
	}
}


function addLine(line) {
	for (i in lines) {
		intersection = line.findLineIntersection(lines[i]);
		for (j in intersection) {
			intersections.push(intersection[j]);
		}
	}
	for (i in arcs) {
		intersection = arcs[i].findLineIntersection(line);
		for (j in intersection) {
			intersections.push(intersection[j]);
		}
	}
	lines.push(line);
}


function createScene() {
	reset();

	addArc(new Arc(0, 0, 100, 280, 300));
	addArc(new Arc(-10, -10, 25, 0, 360));
	addArc(new Arc(0, -100, 90, 125, 340));

	p1 = new Point(-40, 40);
	l = new LineSegment(new Point(-40, 40), new Point(30, 30));

	addLine(new LineSegment(new Point(-40, 40), new Point(30, 30)));
	addLine(new LineSegment(new Point(-80, -80), new Point(30, 100)));

}

function DrawScreen() {
	if (typeof (lines) == 'undefined') {
		//createScene();
		reset();
	}

	// Forces redraw
	canvas.width = canvas.width;

	//context.setTransform(scale, 0, 0, -scale, canvas.width/2, canvas.height/2);
	context.setTransform(1, 0, 0, -1, 0, 0);
	context.scale(scale, scale);
	context.translate(-origin.x, -origin.y);
	
	context.lineWidth=1.0/scale;
	for (i in arcs) {
		if (arcs[i] == selectedShape)
			arcs[i].strokeStyle = '#AA0000';
		arcs[i].Draw();
		if (arcs[i] == selectedShape)
			arcs[i].strokeStyle = '#000000';
	}
	for (i in lines) {
		if (lines[i] == selectedShape)
			lines[i].strokeStyle = '#AA0000';
		lines[i].Draw();
		if (lines[i] == selectedShape)
			lines[i].strokeStyle = '#000000';
	}

	if (snapToIntersections)
		for (i in intersections)
			intersections[i].point.Draw();

	selectedTool.Draw();

	if (usingIntersection)
		curserPoint.strokeStyle = '#FF0000';
	else
		curserPoint.strokeStyle = '#000000';

	curserPoint.Draw();

	curserPoint.strokeStyle = '#000000';

}

function getMousePos(evt) {
	var rect = canvas.getBoundingClientRect();
	var x = (evt.clientX - rect.left)/scale + origin.x;
	var y = (rect.top - evt.clientY)/scale + origin.y
	return new Point(x, y);
}

function getClosestIntersection(p) {
	var minD = Number.MAX_VALUE;
	var closestIntersection = null;

	if (snapToIntersections) {
		for (i in intersections) {
			var d = intersections[i].point.distanceTo(p);
			if (d < minD) {
				minD = d;
				closestIntersection = intersections[i];
			}
		}
	}

	if (snapToCircleCenters) {
		for (i in arcs) {
			var d = arcs[i].c.distanceTo(p);
			if (d < minD) {
				minD = d;
				closestIntersection = new Intersection(arcs[i].c, arcs[i], arcs[i]);
			}
		}
	}

	return closestIntersection;
}

function getClosestPointOnShape(p) {
	var minD = Number.MAX_VALUE;

	var closestPointOnShape = {
		point: null,
		shape: null
	};

	for (i in arcs) {
		var pt = arcs[i].findClosestPoint(p);
		var d = pt.distanceTo(p);
		if (d < minD) {
			minD = d;
			closestPointOnShape.point = pt;
			closestPointOnShape.shape = arcs[i];
		}
	}
	for (i in lines) {
		var pt = lines[i].findClosestPoint(p);
		var d = pt.distanceTo(p);
		if (d < minD) {
			minD = d;
			closestPointOnShape.point = pt;
			closestPointOnShape.shape = lines[i];
		}
	}

	return closestPointOnShape;
}

function getCurserPoint(p, evt) {
	usingIntersection = false;
	var closestPoint = null;

	if (snapToLines) {
		var closestPointOnShape = getClosestPointOnShape(p);
		if (closestPointOnShape.point != null) {
			closestPoint = closestPointOnShape.point;
		}
	}

	var closestIntersection = getClosestIntersection(p);
	if (closestIntersection != null) {
		var distance = p.distanceTo(closestIntersection.point);
		if (distance < 5 / scale) {
			usingIntersection = true;
			closestPoint = closestIntersection.point;
		}
	}

	if (closestPoint != null)
		if (closestPoint.distanceTo(p) < 10 / scale)
			return closestPoint;

	return p;
}

function onMouseMove(evt) {
	mousePoint = getMousePos(evt);
	curserPoint = getCurserPoint(mousePoint, evt);

	if (mouseDown)
		selectedTool.onMouseDragged();
	else
		selectedTool.onMouseMoved();

	DrawScreen();
}

function onMouseDown(evt) {
	mouseDown = true;
	selectedTool.onMousePressed();
	DrawScreen();
}

function onMouseUp(evt) {
	mouseDown = false;
	selectedTool.onMouseReleased();
	DrawScreen();
}

function onMouseWheel(evt) {
	var wheel = evt.deltaY / 10;  // Firefox
	if(Math.abs(wheel) >= 1) {  // IE
		wheel = wheel * 10 / 120;
	}
	var zoom = 1 + wheel/2;
	
	var dx = mousePoint.x - origin.x;
	var dy = mousePoint.y - origin.y;
	var px = dx * scale;   // pixels in x and y
	var py = dy * scale;
	
	origin.x = mousePoint.x - px / (scale * zoom);
	origin.y = mousePoint.y - py / (scale * zoom);
	
	scale *= zoom;
	DrawScreen();
	evt.preventDefault();   // Keep zoom wheel from scrolling page
	evt.returnValue = false;

}

window.onload = function () {
	mousePoint = new Point(0, 0);
	curserPoint = new Point(0, 0);
	compassTool = new CompassTool();
	straightEdgeTool = new StraightEdgeTool();
	selectionTool = new SelectionTool();
	usingIntersection = false;
	snapToLines = true;
	snapToCircleCenters = true;
	snapToIntersections = true;
	scale = 1.0;
	selectedShape = null;
	selectedTool = compassTool;

	canvas = document.getElementById("pendcanvas");
	context = canvas.getContext('2d');

	origin = new Point(-canvas.width/2, canvas.height/2);

	
	canvas.addEventListener('mousemove', onMouseMove);
	canvas.addEventListener('mousedown', onMouseDown);
	canvas.addEventListener('mouseup', onMouseUp);
	canvas.addEventListener('wheel', onMouseWheel);

	DrawScreen();
}

function reset() {
	mouseDown = false;
	lines = [];
	arcs = [];
	intersections = [];

	DrawScreen();
}

function deleteObj() {
	if (selectedShape != null)
		removeObject(selectedShape);
	selectedShape = null;
	DrawScreen();
}

function selectCompass() {
	selectedShape = null;
	selectedTool = compassTool;
	DrawScreen();
}

function selectStraightEdge() {
	selectedShape = null;
	selectedTool = straightEdgeTool;
	DrawScreen();
}

function selectSelection() {
	selectedTool = selectionTool;
	DrawScreen();
}

function onLines() {
	if (document.getElementById('linesCheckbox').checked)
		snapToLines = true;
	else
		snapToLines = false;
	DrawScreen();
}

function onIntersections() {
	if (document.getElementById('intersectionCheckbox').checked)
		snapToIntersections = true;
	else
		snapToIntersections = false;
	DrawScreen();
}

function onCircleCenters() {
	if (document.getElementById('circleCentersCheckbox').checked)
		snapToCircleCenters = true;
	else
		snapToCircleCenters = false;
	DrawScreen();
}