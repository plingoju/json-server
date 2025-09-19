
const FETCH_URL = 'http://localhost:4232/courseList'; 

const Model = {
  courses: [],
  pendingSelectedIds: new Set(),
  confirmedSelectedIds: new Set(),

  async fetchCourses() {
    try {
      const res = await fetch(FETCH_URL);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      this.courses = Array.isArray(data) ? data : (data.courses || []);
    } catch (e) {
      console.error('Failed to fetch courses:', e);
      this.courses = [];
    }
  },

  togglePending(id) {
    if (this.pendingSelectedIds.has(id)) this.pendingSelectedIds.delete(id);
    else this.pendingSelectedIds.add(id);
  },

  isPending(id) { return this.pendingSelectedIds.has(id); },
  isConfirmed(id) { return this.confirmedSelectedIds.has(id); },
  getCourseById(id){ return this.courses.find(c => Number(c.courseId) === Number(id)); },

  getPendingTotal() {
    let sum = 0;
    for (const id of this.pendingSelectedIds) {
      const c = this.getCourseById(id);
      if (c) sum += Number(c.credit || 0);
    }
    return sum;
  },

  canSelectIdWithLimit(id, limit = 18) {
    const current = this.getPendingTotal();
    const c = this.getCourseById(id);
    return (current + (c?.credit || 0)) <= limit;
  },

  confirmPending() {
    for (const id of this.pendingSelectedIds) this.confirmedSelectedIds.add(id);
    this.pendingSelectedIds.clear();
  }
};

const View = {
  dom: {
    availableList: document.getElementById('availableList'),
    selectedList: document.getElementById('selectedList'),
    totalCredits: document.getElementById('totalCredits'),
    selectBtn: document.getElementById('selectBtn')
  },

  render() {
    const availableTitle = this.dom.availableList.querySelector('.bucket-title');
    this.dom.availableList.innerHTML = '';
    this.dom.availableList.appendChild(availableTitle);

    Model.courses
      .filter(c => !Model.isConfirmed(c.courseId))
      .forEach(c => {
        const el = this._makeCourseElement(c);
        if (Model.isPending(c.courseId)) el.classList.add('selected');
        this.dom.availableList.appendChild(el);
      });

    const selectedTitle = this.dom.selectedList.querySelector('.bucket-title');
    this.dom.selectedList.innerHTML = '';
    this.dom.selectedList.appendChild(selectedTitle);

    const confirmed = Model.courses.filter(c => Model.isConfirmed(c.courseId));
    if (confirmed.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.style.opacity = '0.6';
      placeholder.style.textAlign = 'center';
      placeholder.style.paddingTop = '30px';
      placeholder.textContent = 'No selected courses yet.';
      this.dom.selectedList.appendChild(placeholder);
    } else {
      confirmed.forEach(c => {
        const el = this._makeCourseElement(c);
        el.style.cursor = 'default';
        this.dom.selectedList.appendChild(el);
      });
    }

    this.dom.totalCredits.textContent = Model.getPendingTotal();
    this.dom.selectBtn.disabled =
      Model.confirmedSelectedIds.size > 0 || Model.pendingSelectedIds.size === 0;
  },

  _makeCourseElement(course) {
    const el = document.createElement('div');
    el.className = 'course-item';
    el.dataset.id = course.courseId;

    const name = document.createElement('div');
    name.textContent = course.courseName;
    name.style.fontWeight = '600';

    const type = document.createElement('div');
    type.className = 'meta';
    type.textContent = course.required
      ? 'Course Type : Compulsory'
      : 'Course Type : Elective';

    const credit = document.createElement('div');
    credit.className = 'meta';
    credit.textContent = `Credit: ${course.credit}`;

    el.append(name, type, credit);
    return el;
  }
};

const Controller = {
  async init() {
    await Model.fetchCourses();
    View.render();
    this._attachHandlers();
  },

  _attachHandlers() {
    View.dom.availableList.addEventListener('click', ev => {
      const item = ev.target.closest('.course-item');
      if (!item) return;
      const id = Number(item.dataset.id);
      if (Model.isConfirmed(id)) return;

      if (!Model.isPending(id) && !Model.canSelectIdWithLimit(id)) {
        alert('You can only choose up to 18 credits in one semester');
        return;
      }
      Model.togglePending(id);
      View.render();
    });

    View.dom.selectBtn.addEventListener('click', () => {
      const total = Model.getPendingTotal();
      const message =
        `You have chosen ${total} credits for this semester. ` +
        `You cannot change once you submit. Do you want to confirm?`;
      if (confirm(message)) {
        Model.confirmPending();
        View.render();
      }
    });
  }
};

Controller.init();

