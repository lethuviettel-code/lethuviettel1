/* Add this file to the EXISTING Apps Script project; keep Code.gs and its data.
 * Called only by the authenticated Apps Script admin via google.script.run.
 * Changes selected category/element cells; never rewrites price, stock or leads.
 */
function adminClassifySims(token, ids, category, element) {
  auth_(token);
  var types = ['Sim số đẹp', 'Sim thần tài', 'Sim lộc phát', 'Sim phong thủy', 'Sim tam hoa', 'Sim tứ quý'];
  if (types.indexOf(category) < 0) throw new Error('Phân loại sim không hợp lệ.');
  if (!Array.isArray(ids) || !ids.length || ids.length > 500) throw new Error('Chọn từ 1 đến 500 sim mỗi lần.');
  var chosen = new Set(ids.map(function(id) { return int_(id, 'ID sim', 1, Number.MAX_SAFE_INTEGER); }));
  if (element !== null && ['', 'Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'].indexOf(element) < 0) {
    throw new Error('Ngũ hành không hợp lệ.');
  }
  return locked_(function() {
    var sheet = book_().getSheetByName('KhoSim');
    if (!sheet) throw new Error('Không tìm thấy kho sim.');
    var values = sheet.getDataRange().getValues(), headers = values[0] || [];
    var idColumn = headers.indexOf('id'), typeColumn = headers.indexOf('type');
    var elementColumn = headers.indexOf('element'), updatedColumn = headers.indexOf('updated');
    if (idColumn < 0 || typeColumn < 0 || (element !== null && elementColumn < 0)) {
      throw new Error('Kho sim thiếu cột id, type hoặc element.');
    }
    var rows = [], found = new Set();
    values.slice(1).forEach(function(row, i) {
      var id = Number(row[idColumn]);
      if (chosen.has(id)) {
        if (found.has(id)) throw new Error('Kho sim có ID trùng. Chưa cập nhật phân loại.');
        found.add(id); rows.push(i + 2);
      }
    });
    if (found.size !== chosen.size) throw new Error('Một số sim không còn trong kho. Làm mới trước khi lưu.');
    function columnName(index) {
      var result = '';
      for (var n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
        result = String.fromCharCode(65 + (n - 1) % 26) + result;
      }
      return result;
    }
    function updateColumn(index, value) {
      sheet.getRangeList(rows.map(function(row) { return columnName(index) + row; })).setValue(value);
    }
    updateColumn(typeColumn, category);
    if (element !== null) updateColumn(elementColumn, element);
    if (updatedColumn >= 0) updateColumn(updatedColumn, Math.floor(Date.now() / 1000));
    SpreadsheetApp.flush();
    return {ok: true, count: rows.length};
  });
}
