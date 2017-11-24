export class Graph {
  private vertices: string[] = [];
  private edges: any = [];
  private numberOfEdges = 0;

  addVertex(vertex: string) {
    this.vertices.push(vertex);
    this.edges[vertex] = [];
  }

  removeVertex(vertex: any) {
    var index = this.vertices.indexOf(vertex);
    if (~index) {
      this.vertices.splice(index, 1);
    }
    while (this.edges[vertex].length) {
      var adjacentVertex = this.edges[vertex].pop();
      this.removeEdge(adjacentVertex, vertex);
    }
  }

  addEdge(vertex1: string, vertex2: string) {
    this.edges[vertex1].push(vertex2);
    this.edges[vertex2].push(vertex1);
    this.numberOfEdges++;
  }
  removeEdge(vertex1: any, vertex2: any) {
    var index1 = this.edges[vertex1]
      ? this.edges[vertex1].indexOf(vertex2)
      : -1;
    var index2 = this.edges[vertex2]
      ? this.edges[vertex2].indexOf(vertex1)
      : -1;
    if (~index1) {
      this.edges[vertex1].splice(index1, 1);
      this.numberOfEdges--;
    }
    if (~index2) {
      this.edges[vertex2].splice(index2, 1);
    }
  }
  size() {
    return this.vertices.length;
  }
  relations() {
    return this.numberOfEdges;
  }
  traverseDFS(vertex: string, fn: any) {
    if (!~this.vertices.indexOf(vertex)) {
      return console.log('Vertex not found');
    }
    var visited: string[] = [];
    this._traverseDFS(vertex, visited, fn);
  }
  _traverseDFS(vertex: string, visited: any, fn: Function) {
    visited[vertex] = true;
    if (this.edges[vertex] !== undefined) {
      fn(vertex);
    }
    for (var i = 0; i < this.edges[vertex].length; i++) {
      if (!visited[this.edges[vertex][i]]) {
        this._traverseDFS(this.edges[vertex][i], visited, fn);
      }
    }
  }
  traverseBFS(vertex: any, fn: Function) {
    if (!~this.vertices.indexOf(vertex)) {
      return console.log('Vertex not found');
    }
    var queue = [];
    queue.push(vertex);
    var visited: any = [];
    visited[vertex] = true;

    while (queue.length) {
      vertex = queue.shift();
      fn(vertex);
      for (var i = 0; i < this.edges[vertex].length; i++) {
        if (!visited[this.edges[vertex][i]]) {
          visited[this.edges[vertex][i]] = true;
          queue.push(this.edges[vertex][i]);
        }
      }
    }
  }
  pathFromTo(vertexSource: any, vertexDestination: any) {
    if (!~this.vertices.indexOf(vertexSource)) {
      return console.log('Vertex not found');
    }
    var queue = [];
    queue.push(vertexSource);
    var visited = [];
    visited[vertexSource] = true;
    var paths = [];

    while (queue.length) {
      var vertex = queue.shift();
      for (var i = 0; i < this.edges[vertex].length; i++) {
        if (!visited[this.edges[vertex][i]]) {
          visited[this.edges[vertex][i]] = true;
          queue.push(this.edges[vertex][i]);
          // save paths between vertices
          paths[this.edges[vertex][i]] = vertex;
        }
      }
    }
    if (!visited[vertexDestination]) {
      return undefined;
    }

    var path = [];
    for (var j = vertexDestination; j != vertexSource; j = paths[j]) {
      path.push(j);
    }
    path.push(j);
    return path.reverse().join('-');
  }
  print() {
    console.log(
      this.vertices
        .map((vertex) => {
          return (vertex + ' -> ' + this.edges[vertex].join(', ')).trim();
        })
        .join(' | ')
    );
  }
}
